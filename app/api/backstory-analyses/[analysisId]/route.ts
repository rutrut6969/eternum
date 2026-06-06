import { ApprovalStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { mergeStringList, normalizeBackstorySuggestion } from "@/lib/backstory";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "request_edits"]),
  note: z.string().max(2000).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ analysisId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { analysisId } = await params;

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });

  const analysis = await prisma.backstoryAnalysis.findUnique({
    where: { id: analysisId },
    include: { character: true }
  });
  if (!analysis?.character.campaignId) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });

  try {
    await requireCampaignDm(analysis.character.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const status =
    parsed.data.action === "approve"
      ? ApprovalStatus.APPROVED_PRIVATE
      : parsed.data.action === "request_edits"
        ? ApprovalStatus.NEEDS_CHANGES
        : ApprovalStatus.REJECTED;

  const updated = await prisma.backstoryAnalysis.update({
    where: { id: analysis.id },
    data: { status, dmNotes: parsed.data.note, reviewedAt: new Date() }
  });

  if (parsed.data.action === "approve") {
    const suggestion = normalizeBackstorySuggestion(analysis.suggestion);
    const nextInventory = (
      Array.isArray(analysis.character.inventory)
        ? [...analysis.character.inventory, ...(suggestion.startingItems ?? [])]
        : suggestion.startingItems ?? []
    ) as Prisma.InputJsonValue;

    await prisma.$transaction(async (tx) => {
      for (const profession of suggestion.professionStartingLevels ?? []) {
        const name = profession.profession ?? profession.name;
        if (!name) continue;
        await tx.professionProgress.upsert({
          where: { characterId_profession: { characterId: analysis.characterId, profession: name } },
          create: { characterId: analysis.characterId, profession: name, level: Math.max(0, profession.level ?? 1) },
          update: { level: { increment: Math.max(0, profession.level ?? 1) } }
        });
      }

      await tx.character.update({
        where: { id: analysis.characterId },
        data: {
          approvedAt: new Date(),
          traits: mergeStringList(analysis.character.traits, suggestion.traits),
          flaws: mergeStringList(analysis.character.flaws, suggestion.flaws),
          affinities: mergeStringList(analysis.character.affinities, suggestion.magicalAffinities),
          inventory: nextInventory
        }
      });
    });
  }

  return NextResponse.json({ analysis: updated });
}
