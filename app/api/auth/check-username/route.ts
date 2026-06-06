import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, validateUsername } from "@/lib/auth/validation";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username") || "";
  const validation = validateUsername(username);

  if (!validation.valid) {
    return NextResponse.json({ available: false, message: "Invalid username" });
  }

  const normalizedUsername = normalizeUsername(username);
  const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });

  if (existing) {
    return NextResponse.json({ available: false, message: "Username is already taken." });
  }

  return NextResponse.json({ available: true });
}
