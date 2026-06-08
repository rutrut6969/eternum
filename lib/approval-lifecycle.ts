import type { ActivityType, ApprovalStatus, ContentType, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export const canonicalApprovalStatusLabels: Record<ApprovalStatus, string> = {
  DRAFT: "DRAFT",
  PENDING_DM_REVIEW: "PENDING_APPROVAL",
  NEEDS_CHANGES: "EDITS_REQUESTED",
  REJECTED: "DENIED",
  APPROVED_PRIVATE: "APPROVED",
  APPROVED_PUBLIC: "APPROVED",
  ARCHIVED: "ARCHIVED"
};

export async function deriveSubmissionContext(tx: Tx, input: {
  userId: string;
  characterId?: string | null;
  campaignId?: string | null;
  submitForReview?: boolean;
}) {
  if (input.characterId) {
    const character = await tx.character.findUnique({
      where: { id: input.characterId },
      select: { id: true, ownerId: true, campaignId: true, name: true }
    });
    if (!character || character.ownerId !== input.userId) {
      throw new Error("Character ownership is required for this submission.");
    }
    if (input.campaignId && character.campaignId && input.campaignId !== character.campaignId) {
      throw new Error("Submitted campaign does not match the linked character.");
    }
    if (input.submitForReview && !character.campaignId) {
      throw new Error("A campaign-linked character is required for DM approval.");
    }
    return { characterId: character.id, campaignId: character.campaignId ?? null, characterName: character.name };
  }

  if (input.submitForReview && !input.campaignId) {
    throw new Error("A campaign or campaign-linked character is required for DM approval.");
  }

  return { characterId: null, campaignId: input.campaignId ?? null, characterName: null };
}

export async function ensureApprovalRequest(tx: Tx, input: {
  campaignId: string;
  homebrewId: string;
  status?: ApprovalStatus;
  requestNote?: string | null;
}) {
  const existing = await tx.approvalRequest.findFirst({ where: { homebrewId: input.homebrewId }, orderBy: { createdAt: "desc" } });
  if (existing) {
    return tx.approvalRequest.update({
      where: { id: existing.id },
      data: {
        campaignId: input.campaignId,
        status: input.status ?? "PENDING_DM_REVIEW",
        requestNote: input.requestNote ?? existing.requestNote,
        reviewNote: null,
        reviewerId: null,
        reviewedAt: null
      }
    });
  }
  return tx.approvalRequest.create({
    data: {
      campaignId: input.campaignId,
      homebrewId: input.homebrewId,
      status: input.status ?? "PENDING_DM_REVIEW",
      requestNote: input.requestNote
    }
  });
}

export async function updateApprovalRequestReview(tx: Tx, input: {
  homebrewId: string;
  campaignId: string;
  status: ApprovalStatus;
  reviewerId: string;
  reviewNote?: string | null;
}) {
  const existing = await tx.approvalRequest.findFirst({ where: { homebrewId: input.homebrewId }, orderBy: { createdAt: "desc" } });
  if (!existing) {
    return tx.approvalRequest.create({
      data: {
        campaignId: input.campaignId,
        homebrewId: input.homebrewId,
        status: input.status,
        reviewerId: input.reviewerId,
        reviewNote: input.reviewNote,
        reviewedAt: new Date()
      }
    });
  }
  return tx.approvalRequest.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      reviewerId: input.reviewerId,
      reviewNote: input.reviewNote,
      reviewedAt: new Date()
    }
  });
}

function asArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value : [];
}

function appendUnique(current: Prisma.JsonValue, value: Record<string, unknown>) {
  const existing = asArray(current);
  const withoutDuplicate = existing.filter((item) => {
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return record.homebrewId !== value.homebrewId && record.id !== value.id;
  });
  return [...withoutDuplicate, value] as Prisma.InputJsonValue;
}

export function isCraftedHomebrew(type: ContentType, body: Prisma.JsonValue) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  return type === "CRAFTING_RECIPE" || record.source === "crafted" || Boolean(record.craftingRequirements) || Boolean(record.materials);
}

export async function integrateApprovedHomebrew(tx: Tx, input: {
  homebrewId: string;
  approvedStatus: ApprovalStatus;
}) {
  const content = await tx.homebrewContent.findUnique({ where: { id: input.homebrewId }, include: { character: true } });
  if (!content?.character) return null;

  const card = {
    id: content.id,
    homebrewId: content.id,
    name: content.title,
    title: content.title,
    summary: content.summary,
    rarity: content.rarity,
    discipline: content.discipline,
    rulesResult: content.rulesResult,
    body: content.body,
    status: canonicalApprovalStatusLabels[input.approvedStatus],
    approvedAt: new Date().toISOString(),
    source: "homebrew"
  };

  const data: Prisma.CharacterUpdateInput = {};
  let milestone: { type: ActivityType; title: string } | null = null;

  if (content.type === "CUSTOM_SPELL") {
    data.customSpells = appendUnique(content.character.customSpells, card);
    data.learnedSpells = appendUnique(content.character.learnedSpells, { ...card, source: "custom_homebrew" });
    milestone = { type: "SPELL_LEARNED", title: `${content.title} approved` };
  } else if (content.type === "CUSTOM_ITEM" || content.type === "CRAFTING_RECIPE") {
    data.inventory = appendUnique(content.character.inventory, { ...card, quantity: 1, equipped: false, source: isCraftedHomebrew(content.type, content.body) ? "crafted" : "homebrew" });
    if (isCraftedHomebrew(content.type, content.body)) {
      data.craftedItems = appendUnique(content.character.craftedItems, card);
      milestone = { type: "ITEM_CRAFTED", title: `${content.title} approved` };
    } else {
      milestone = { type: "LOOT_AWARDED", title: `${content.title} approved` };
    }
  } else if (content.type === "TRAIT" || content.type === "PROFESSION_PERK" || content.type === "HOMEBREW_ABILITY") {
    data.traits = appendUnique(content.character.traits, card);
    milestone = { type: "CHARACTER_UPDATED", title: `${content.title} approved` };
  } else if (content.type === "AFFINITY" || content.type === "MAGICAL_DISCIPLINE") {
    data.affinities = appendUnique(content.character.affinities, card);
    milestone = { type: "AFFINITY_GAINED", title: `${content.title} approved` };
  } else if (content.type === "COMPANION") {
    data.tamedCreatures = appendUnique(content.character.tamedCreatures, card);
    milestone = { type: "CHARACTER_UPDATED", title: `${content.title} approved` };
  } else if (content.type === "UNDEAD_SERVANT") {
    data.undeadServants = appendUnique(content.character.undeadServants, card);
    milestone = { type: "CHARACTER_UPDATED", title: `${content.title} approved` };
  }

  if (Object.keys(data).length === 0) return null;
  await tx.character.update({ where: { id: content.character.id }, data });
  if (milestone) {
    await tx.characterMilestone.create({
      data: {
        characterId: content.character.id,
        campaignId: content.campaignId,
        type: milestone.type,
        title: milestone.title,
        metadata: { homebrewId: content.id, status: input.approvedStatus, canonicalStatus: canonicalApprovalStatusLabels[input.approvedStatus] }
      }
    });
  }
  return content.character.id;
}

export async function logApprovalActivity(tx: Tx, input: {
  campaignId?: string | null;
  actorId?: string | null;
  type: ActivityType;
  metadata: Prisma.InputJsonValue;
}) {
  if (!input.campaignId) return null;
  return tx.activityLog.create({
    data: {
      campaignId: input.campaignId,
      actorId: input.actorId,
      type: input.type,
      metadata: input.metadata
    }
  });
}
