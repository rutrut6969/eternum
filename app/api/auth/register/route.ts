import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { emailVerificationService } from "@/lib/auth/email-verification-service";
import { normalizeUsername, validateEmailFormat, validatePassword, validateUsername } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string(),
  email: z.string().email(),
  password: z.string()
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });
  }

  const usernameValidation = validateUsername(parsed.data.username);
  if (!usernameValidation.valid) {
    return NextResponse.json({ error: usernameValidation.message }, { status: 400 });
  }

  const passwordValidation = validatePassword(parsed.data.password);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: `Password requirement missing: ${passwordValidation.message}.` }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!validateEmailFormat(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const emailVerification = await emailVerificationService.verify(email);
  if (!emailVerification.valid) {
    return NextResponse.json({ error: emailVerification.message || "Use a valid email address." }, { status: 400 });
  }

  const username = normalizeUsername(parsed.data.username);
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username,
      displayUsername: parsed.data.username.trim(),
      email,
      passwordHash,
      globalRoles: ["PLAYER"]
    }
  });

  return NextResponse.json({ id: user.id, email: user.email, username: user.username });
}
