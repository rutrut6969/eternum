import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const activity = await prisma.activityLog.findMany({
    where: { campaignId },
    include: { actor: { select: { name: true, username: true } }, session: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ activity });
}
