import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { itemSystemPrompt } from "@/lib/ai/prompts";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { authOptions } from "@/lib/auth/options";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { slugForHomebrew } from "@/lib/homebrew";
import { createHomebrewRevision, homebrewSubmissionSnapshot } from "@/lib/homebrew-submissions";
import { prisma } from "@/lib/prisma";
import { validateItemPower } from "@/lib/rules/items";
import { recordAIUsage, subscriptionService } from "@/lib/subscriptions/service";

const schema = z.object({
  idea: z.string().min(20).max(4000),
  campaignId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional(),
  submitForReview: z.boolean().default(true)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid item idea." }, { status: 400 });
  if (!(await subscriptionService.canUseAdvancedAI(userId))) return NextResponse.json({ error: "Advanced AI requires a DM, Worldbuilder, or Founder plan." }, { status: 403 });

  if (parsed.data.campaignId) {
    try {
      await requireCampaignMember(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
    }
  }
  await recordAIUsage(userId);

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: openAIModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: itemSystemPrompt },
      { role: "user", content: parsed.data.idea }
    ]
  });

  const formatted = JSON.parse(completion.choices[0]?.message.content || "{}");
  const rules = validateItemPower({
    rarity: String(formatted.rarity || "common"),
    stats: formatted.stats,
    attunementRequired: Boolean(formatted.attunementRequired)
  });
  const title = String(formatted.name || "Custom Item");
  const homebrew = await prisma.$transaction(async (tx) => {
    const created = await tx.homebrewContent.create({
      data: {
        type: "CUSTOM_ITEM",
        title,
        slug: slugForHomebrew(title),
        summary: String(formatted.description || parsed.data.idea).slice(0, 500),
        body: { ...formatted, characterId: parsed.data.characterId },
        rulesResult: rules,
        rarity: String(formatted.rarity || rules.rarity),
        professionRequirements: Array.isArray(formatted.professionRequirements) ? formatted.professionRequirements : [],
        imagePrompt: formatted.imagePrompt ? String(formatted.imagePrompt) : undefined,
        imageAltText: formatted.imageAltText ? String(formatted.imageAltText) : undefined,
        generatedByAi: true,
        status: parsed.data.submitForReview ? "PENDING_DM_REVIEW" : "DRAFT",
        visibility: parsed.data.campaignId ? "CAMPAIGN_ONLY" : "PRIVATE_USER",
        campaignId: parsed.data.campaignId,
        characterId: parsed.data.characterId,
        submittedAt: parsed.data.submitForReview ? new Date() : undefined,
        authorId: userId
      }
    });
    await createHomebrewRevision(tx, {
      homebrewId: created.id,
      submittedById: userId,
      snapshot: homebrewSubmissionSnapshot(created)
    });
    return tx.homebrewContent.findUniqueOrThrow({ where: { id: created.id } });
  });

  return NextResponse.json({ formatted, rules, homebrew, approvalRequired: true });
}
