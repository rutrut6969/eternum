import { ContentType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { deriveSubmissionContext, ensureApprovalRequest, logApprovalActivity } from "@/lib/approval-lifecycle";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { slugForHomebrew } from "@/lib/homebrew";
import { createHomebrewRevision, homebrewSubmissionSnapshot } from "@/lib/homebrew-submissions";
import { prisma } from "@/lib/prisma";
import { validateItemPower } from "@/lib/rules/items";
import { calculateInfusedSpell, deriveTierFromMana } from "@/lib/rules/spells";

const schema = z.object({
  type: z.enum(["CUSTOM_SPELL", "CUSTOM_ITEM", "CRAFTING_RECIPE", "MONSTER_NPC", "PROFESSION_PERK", "MAGICAL_DISCIPLINE", "TRAIT", "AFFINITY", "COMPANION", "UNDEAD_SERVANT", "HOMEBREW_ABILITY"]),
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  campaignId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional(),
  body: z.record(z.unknown()),
  rarity: z.string().optional(),
  discipline: z.string().optional(),
  professionRequirements: z.array(z.unknown()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imagePrompt: z.string().max(2000).optional(),
  imageAltText: z.string().max(300).optional(),
  generatedByAi: z.boolean().default(false),
  submitForReview: z.boolean().default(true)
});

function rulesFor(parsed: z.infer<typeof schema>) {
  if (parsed.type === "CUSTOM_ITEM") {
    return validateItemPower({
      rarity: parsed.rarity ?? String(parsed.body.rarity ?? "common"),
      stats: parsed.body.stats,
      attunementRequired: Boolean(parsed.body.attunementRequired)
    });
  }

  if (parsed.type === "CUSTOM_SPELL") {
    const baseTier = deriveTierFromMana(Number(parsed.body.baseManaIntent ?? parsed.body.manaCost ?? 5));
    return calculateInfusedSpell(baseTier, []);
  }

  return { balanceNotes: ["DM approval required before campaign use."] };
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid homebrew content." }, { status: 400 });

  if (parsed.data.campaignId) {
    try {
      await requireCampaignMember(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
    }
  }

  const rulesResult = rulesFor(parsed.data);
  const result = await prisma.$transaction(async (tx) => {
    const context = await deriveSubmissionContext(tx, {
      userId,
      characterId: parsed.data.characterId,
      campaignId: parsed.data.campaignId,
      submitForReview: parsed.data.submitForReview
    });
    const created = await tx.homebrewContent.create({
      data: {
        type: parsed.data.type as ContentType,
        title: parsed.data.title,
        slug: slugForHomebrew(parsed.data.title),
        summary: parsed.data.summary,
        body: { ...parsed.data.body, characterId: context.characterId } as Prisma.InputJsonValue,
        rulesResult: rulesResult as Prisma.InputJsonValue,
        rarity: parsed.data.rarity,
        discipline: parsed.data.discipline,
        professionRequirements: (parsed.data.professionRequirements ?? []) as Prisma.InputJsonValue,
        imageUrl: parsed.data.imageUrl || undefined,
        imagePrompt: parsed.data.imagePrompt,
        imageAltText: parsed.data.imageAltText,
        generatedByAi: parsed.data.generatedByAi,
        status: parsed.data.submitForReview ? "PENDING_DM_REVIEW" : "DRAFT",
        visibility: context.campaignId ? "CAMPAIGN_ONLY" : "PRIVATE_USER",
        campaignId: context.campaignId,
        characterId: context.characterId,
        submittedAt: parsed.data.submitForReview ? new Date() : undefined,
        authorId: userId
      }
    });
    await createHomebrewRevision(tx, {
      homebrewId: created.id,
      submittedById: userId,
      snapshot: homebrewSubmissionSnapshot(created) as Prisma.InputJsonValue
    });
    if (parsed.data.submitForReview && context.campaignId) {
      await ensureApprovalRequest(tx, {
        campaignId: context.campaignId,
        homebrewId: created.id,
        requestNote: `${created.type.replace(/_/g, " ")} submitted for DM approval.`
      });
      await logApprovalActivity(tx, {
        campaignId: context.campaignId,
        actorId: userId,
        type: "HOMEBREW_SUBMITTED",
        metadata: { homebrewId: created.id, title: created.title, contentType: created.type, characterId: context.characterId }
      });
    }
    return tx.homebrewContent.findUniqueOrThrow({ where: { id: created.id } });
  }).then((homebrew) => ({ homebrew })).catch((error) => {
    const message = error instanceof Error ? error.message : "Submission failed.";
    return { error: message };
  });

  if ("error" in result) return NextResponse.json({ error: result.error || "Submission Failed" }, { status: 400 });

  return NextResponse.json({ homebrew: result.homebrew }, { status: 201 });
}
