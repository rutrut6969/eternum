import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ homebrewId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { homebrewId } = await params;

  const content = await prisma.homebrewContent.findUnique({ where: { id: homebrewId } });
  if (!content || content.authorId !== userId) return NextResponse.json({ error: "Homebrew not found." }, { status: 404 });
  if (content.status !== "APPROVED_PRIVATE") return NextResponse.json({ error: "Only approved private content can request public publishing." }, { status: 400 });

  const updated = await prisma.homebrewContent.update({
    where: { id: content.id },
    data: { status: "PENDING_DM_REVIEW", publishRequestedAt: new Date() }
  });

  return NextResponse.json({ homebrew: updated });
}
