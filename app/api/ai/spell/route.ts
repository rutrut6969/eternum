import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { spellSystemPrompt } from "@/lib/ai/prompts";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { authOptions } from "@/lib/auth/options";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { slugForHomebrew } from "@/lib/homebrew";
import { prisma } from "@/lib/prisma";
import { calculateInfusedSpell, deriveTierFromMana } from "@/lib/rules/spells";
import { recordAIUsage } from "@/lib/subscriptions/service";

const schema = z.object({
  idea: z.string().min(20).max(4000),
  baseManaIntent: z.number().int().min(1).max(120).default(5),
  campaignId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional(),
  submitForReview: z.boolean().default(true)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid spell idea." }, { status: 400 });

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
      { role: "system", content: spellSystemPrompt },
      { role: "user", content: parsed.data.idea }
    ]
  });

  const formatted = JSON.parse(completion.choices[0]?.message.content || "{}");
  const baseTier = deriveTierFromMana(parsed.data.baseManaIntent);
  const rules = {
    ...calculateInfusedSpell(baseTier, []),
    concentrationCost: formatted.duration && String(formatted.duration).toLowerCase().includes("concentration") ? Math.max(1, baseTier) : 0,
    infusionOptions: formatted.infusionIdeas ?? []
  };

  const title = String(formatted.name || "Custom Spell");
  const homebrew = await prisma.homebrewContent.create({
    data: {
      type: "CUSTOM_SPELL",
      title,
      slug: slugForHomebrew(title),
      summary: String(formatted.baseEffect || parsed.data.idea).slice(0, 500),
      body: { ...formatted, characterId: parsed.data.characterId, baseManaIntent: parsed.data.baseManaIntent },
      rulesResult: rules,
      discipline: formatted.discipline ? String(formatted.discipline) : undefined,
      status: parsed.data.submitForReview ? "PENDING_DM_REVIEW" : "DRAFT",
      visibility: parsed.data.campaignId ? "CAMPAIGN_ONLY" : "PRIVATE_USER",
      campaignId: parsed.data.campaignId,
      authorId: userId,
      generatedByAi: true
    }
  });

  return NextResponse.json({ formatted, rules, homebrew, approvalRequired: true });
}
