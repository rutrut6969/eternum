import { ContentType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { createHomebrewRevision, homebrewSubmissionSnapshot } from "@/lib/homebrew-submissions";
import { prisma } from "@/lib/prisma";
import { validateItemPower } from "@/lib/rules/items";
import { calculateInfusedSpell, deriveTierFromMana } from "@/lib/rules/spells";

const schema = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().max(500).optional(),
  body: z.record(z.unknown()),
  rarity: z.string().optional(),
  discipline: z.string().optional(),
  professionRequirements: z.array(z.unknown()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imagePrompt: z.string().max(2000).optional(),
  imageAltText: z.string().max(300).optional()
});

function rulesFor(type: ContentType, parsed: z.infer<typeof schema>) {
  if (type === "CUSTOM_ITEM") {
    return validateItemPower({
      rarity: parsed.rarity ?? String(parsed.body.rarity ?? "common"),
      stats: parsed.body.stats,
      attunementRequired: Boolean(parsed.body.attunementRequired)
    });
  }
  if (type === "CUSTOM_SPELL") {
    const baseTier = deriveTierFromMana(Number(parsed.body.baseManaIntent ?? parsed.body.manaCost ?? 5));
    return calculateInfusedSpell(baseTier, []);
  }
  return { balanceNotes: ["DM approval required before campaign use."] };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ homebrewId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { homebrewId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid revised submission." }, { status: 400 });

  const content = await prisma.homebrewContent.findUnique({ where: { id: homebrewId } });
  if (!content || content.authorId !== userId) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (!["DRAFT", "REJECTED", "NEEDS_CHANGES"].includes(content.status)) {
    return NextResponse.json({ error: "Only drafts, denied submissions, or edit-requested submissions can be revised." }, { status: 400 });
  }
  if (!content.campaignId) return NextResponse.json({ error: "A campaign-linked submission is required for DM review." }, { status: 400 });

  try {
    await requireCampaignMember(content.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const rulesResult = rulesFor(content.type, parsed.data);
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.homebrewContent.update({
      where: { id: content.id },
      data: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        body: { ...parsed.data.body, characterId: content.characterId } as Prisma.InputJsonValue,
        rulesResult: rulesResult as Prisma.InputJsonValue,
        rarity: parsed.data.rarity,
        discipline: parsed.data.discipline,
        professionRequirements: (parsed.data.professionRequirements ?? []) as Prisma.InputJsonValue,
        imageUrl: parsed.data.imageUrl || undefined,
        imagePrompt: parsed.data.imagePrompt,
        imageAltText: parsed.data.imageAltText,
        status: "PENDING_DM_REVIEW",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedByUserId: null,
        dmFeedback: null
      }
    });
    await createHomebrewRevision(tx, {
      homebrewId: next.id,
      submittedById: userId,
      snapshot: homebrewSubmissionSnapshot(next)
    });
    return tx.homebrewContent.findUniqueOrThrow({
      where: { id: next.id },
      include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } }
    });
  });

  return NextResponse.json({ homebrew: updated });
}
