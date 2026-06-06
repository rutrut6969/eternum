import type { CampaignRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  if (!membership) throw new Error("Campaign membership required.");
  return membership;
}

export async function requireCampaignDm(campaignId: string, userId: string) {
  const membership = await requireCampaignMember(campaignId, userId);
  if (!hasDmPermission(membership.roles)) throw new Error("DM permission required.");
  return membership;
}
