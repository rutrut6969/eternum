export type HomebrewStatus = "draft" | "pending_dm_review" | "approved_private" | "approved_public" | "rejected" | "archived";
export type HomebrewVisibility = "campaign_only" | "private_user" | "public_library" | "official_eternum";

export function nextApprovalState(current: HomebrewStatus, approved: boolean, publishPublicly: boolean): HomebrewStatus {
  if (current !== "pending_dm_review") return current;
  if (!approved) return "rejected";
  return publishPublicly ? "approved_public" : "approved_private";
}

export function canUseInCampaign(status: HomebrewStatus) {
  return status === "approved_private" || status === "approved_public";
}
