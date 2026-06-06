import type { CampaignInvite } from "@prisma/client";

export function getInviteStatus(invite: Pick<CampaignInvite, "status" | "expiresAt"> | null, now = new Date()) {
  if (!invite) return "invalid";
  if (invite.status === "ACCEPTED") return "used";
  if (invite.status === "REVOKED") return "revoked";
  if (invite.status === "EXPIRED" || invite.expiresAt < now) return "expired";
  return "active";
}
