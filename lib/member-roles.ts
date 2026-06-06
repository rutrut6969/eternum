import type { CampaignMember, CampaignRole } from "@prisma/client";

export function normalizeRoles(roles: CampaignRole[]) {
  return Array.from(new Set(roles));
}

export function wouldRemoveFinalDm(input: {
  actingUserId: string;
  target: Pick<CampaignMember, "userId" | "roles">;
  allMembers: Array<Pick<CampaignMember, "id" | "roles">>;
  nextRoles: CampaignRole[];
}) {
  const hadDm = input.target.roles.includes("DM");
  const keepsDm = input.nextRoles.includes("DM");
  if (!hadDm || keepsDm || input.target.userId !== input.actingUserId) return false;

  const otherDmExists = input.allMembers.some((member) => member !== input.target && member.roles.includes("DM"));
  return !otherDmExists;
}
