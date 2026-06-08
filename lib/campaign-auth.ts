import type { CampaignRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function getFounderFallback(campaignId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isFounder: true } });
  if (!user?.isFounder) return null;

  return {
    id: `founder:${campaignId}:${userId}`,
    campaignId,
    userId,
    roles: ["DM", "PLAYER"] as CampaignRole[],
    createdAt: new Date()
  };
}

export async function getMembership(campaignId: string, userId: string) {
  return prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } }
  });
}

export function hasDmPermission(roles: CampaignRole[] = []) {
  return roles.includes("DM") || roles.includes("ASSISTANT_DM");
}

export async function requireCampaignMember(campaignId: string, userId: string) {
  const membership = await getMembership(campaignId, userId);
  if (!membership) {
    const founderAccess = await getFounderFallback(campaignId, userId);
    if (founderAccess) return founderAccess;
    throw new Error("Campaign membership required.");
  }
  return membership;
}

export async function requireCampaignDm(campaignId: string, userId: string) {
  const membership = await requireCampaignMember(campaignId, userId);
  if (!hasDmPermission(membership.roles)) throw new Error("DM permission required.");
  return membership;
}
