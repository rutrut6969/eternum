import type { ApprovalStatus, HomebrewContent, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export function homebrewSubmissionSnapshot(
  content: Pick<HomebrewContent, "type" | "title" | "summary" | "body" | "rulesResult" | "rarity" | "discipline" | "professionRequirements" | "imageUrl" | "imagePrompt" | "imageAltText" | "generatedByAi" | "status" | "visibility" | "campaignId" | "characterId">
) {
  return {
    type: content.type,
    title: content.title,
    summary: content.summary,
    body: content.body,
    rulesResult: content.rulesResult,
    rarity: content.rarity,
    discipline: content.discipline,
    professionRequirements: content.professionRequirements,
    imageUrl: content.imageUrl,
    imagePrompt: content.imagePrompt,
    imageAltText: content.imageAltText,
    generatedByAi: content.generatedByAi,
    status: content.status,
    visibility: content.visibility,
    campaignId: content.campaignId,
    characterId: content.characterId
  };
}

export async function createHomebrewRevision(tx: Tx, input: {
  homebrewId: string;
  submittedById: string;
  snapshot: Prisma.InputJsonValue;
}) {
  const latest = await tx.homebrewRevision.findFirst({
    where: { homebrewId: input.homebrewId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true }
  });
  const revision = await tx.homebrewRevision.create({
    data: {
      homebrewId: input.homebrewId,
      revisionNumber: (latest?.revisionNumber ?? 0) + 1,
      submittedById: input.submittedById,
      contentSnapshot: input.snapshot
    }
  });
  await tx.homebrewContent.update({
    where: { id: input.homebrewId },
    data: { currentRevisionId: revision.id }
  });
  return revision;
}

export async function markCurrentRevisionReviewed(tx: Tx, input: {
  revisionId?: string | null;
  decision: ApprovalStatus;
  feedback?: string | null;
  reviewedById: string;
}) {
  if (!input.revisionId) return null;
  return tx.homebrewRevision.update({
    where: { id: input.revisionId },
    data: {
      dmDecision: input.decision,
      dmFeedback: input.feedback,
      reviewedById: input.reviewedById,
      reviewedAt: new Date()
    }
  });
}
