import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { integrateApprovedHomebrew, logApprovalActivity, updateApprovalRequestReview } from "@/lib/approval-lifecycle";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { markCurrentRevisionReviewed } from "@/lib/homebrew-submissions";
import { subscriptionService } from "@/lib/subscriptions/service";

const schema = z.object({
  action: z.enum(["approve_private", "approve_public", "reject", "request_edits", "archive"]),
  note: z.string().max(2000).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ homebrewId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { homebrewId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
  if ((parsed.data.action === "reject" || parsed.data.action === "request_edits") && !parsed.data.note?.trim()) {
    return NextResponse.json({ error: "DM feedback is required when denying or requesting edits." }, { status: 400 });
  }

  if (parsed.data.action === "approve_public") {
    const reviewer = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
    if (!reviewer?.emailVerified) return NextResponse.json({ error: "Verify your email before publishing public homebrew." }, { status: 403 });
    if (!(await subscriptionService.canPublishPublicHomebrew(userId))) return NextResponse.json({ error: "Your current plan cannot publish public homebrew." }, { status: 403 });
  }

  const content = await prisma.homebrewContent.findUnique({ where: { id: homebrewId } });
  if (!content?.campaignId) return NextResponse.json({ error: "Homebrew not found." }, { status: 404 });

  try {
    await requireCampaignDm(content.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const status =
    parsed.data.action === "approve_public"
      ? "APPROVED_PUBLIC"
      : parsed.data.action === "approve_private"
        ? "APPROVED_PRIVATE"
        : parsed.data.action === "archive"
          ? "ARCHIVED"
          : parsed.data.action === "request_edits"
            ? "NEEDS_CHANGES"
            : "REJECTED";

  const visibility = parsed.data.action === "approve_public" ? "PUBLIC_LIBRARY" : content.visibility;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.homebrewContent.update({
      where: { id: content.id },
      data: {
        status,
        visibility,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        dmFeedback: parsed.data.note?.trim() || null,
        publishedAt: parsed.data.action === "approve_public" ? new Date() : content.publishedAt
      }
    });
    await markCurrentRevisionReviewed(tx, {
      revisionId: content.currentRevisionId,
      decision: status,
      feedback: parsed.data.note?.trim() || null,
      reviewedById: userId
    });
    await updateApprovalRequestReview(tx, {
      homebrewId: content.id,
      campaignId: content.campaignId!,
      status,
      reviewerId: userId,
      reviewNote: parsed.data.note?.trim() || null
    });
    if (parsed.data.action === "approve_private" || parsed.data.action === "approve_public") {
      await integrateApprovedHomebrew(tx, { homebrewId: content.id, approvedStatus: status });
    }
    const activityType =
      parsed.data.action === "approve_private" || parsed.data.action === "approve_public"
        ? parsed.data.action === "approve_public"
          ? "HOMEBREW_PUBLISHED"
          : "HOMEBREW_APPROVED"
        : parsed.data.action === "request_edits"
          ? "HOMEBREW_CHANGES_REQUESTED"
          : parsed.data.action === "reject"
            ? "HOMEBREW_DENIED"
            : "HOMEBREW_DENIED";
    await logApprovalActivity(tx, {
      campaignId: content.campaignId,
      actorId: userId,
      type: activityType,
      metadata: { homebrewId: content.id, title: content.title, contentType: content.type, status, feedback: parsed.data.note?.trim() || null } as Prisma.InputJsonValue
    });
    return next;
  });

  return NextResponse.json({ homebrew: updated });
}
