import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ sent: false, message: "Email is already verified." });

  const verification = createEmailVerificationToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verification.token,
      emailVerificationExpires: verification.expires
    }
  });

  const result = await sendVerificationEmail({ email: user.email, name: user.name, token: verification.token });
  if (!result.sent) {
    return NextResponse.json({ error: result.message || "Could not send verification email." }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
