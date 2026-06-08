import { NextResponse } from "next/server";
import { ensureApprovalRequest, logApprovalActivity } from "@/lib/approval-lifecycle";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

export async function POST(_request: Request, { params }: { params: Promise<{ homebrewId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { homebrewId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) return NextResponse.json({ error: "Verify your email before requesting public publishing." }, { status: 403 });
  if (!(await subscriptionService.canPublishPublicHomebrew(userId))) return NextResponse.json({ error: "Your current plan cannot publish public homebrew." }, { status: 403 });

  const content = await prisma.homebrewContent.findUnique({ where: { id: homebrewId } });
  if (!content || content.authorId !== userId) return NextResponse.json({ error: "Homebrew not found." }, { status: 404 });
  if (content.status !== "APPROVED_PRIVATE") return NextResponse.json({ error: "Only approved private content can request public publishing." }, { status: 400 });
  if (!content.campaignId) return NextResponse.json({ error: "Campaign-linked content is required for DM publication review." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.homebrewContent.update({
      where: { id: content.id },
      data: { status: "PENDING_DM_REVIEW", publishRequestedAt: new Date(), submittedAt: new Date(), reviewedAt: null, reviewedByUserId: null }
    });
    await ensureApprovalRequest(tx, {
      campaignId: content.campaignId!,
      homebrewId: content.id,
      requestNote: "Author requested public library publication."
    });
    await logApprovalActivity(tx, {
      campaignId: content.campaignId,
      actorId: userId,
      type: "HOMEBREW_SUBMITTED",
      metadata: { homebrewId: content.id, title: content.title, contentType: content.type, publishRequested: true }
    });
    return next;
  });

  return NextResponse.json({ homebrew: updated });
}
