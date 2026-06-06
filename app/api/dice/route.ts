import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { hasDmPermission, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { rollDiceExpression } from "@/lib/rules/dice";

const visibilityMap = {
  dm_only: "DM_ONLY",
  roller_and_dm: "ROLLER_AND_DM",
  party_visible: "PARTY_VISIBLE",
  public: "PUBLIC"
} as const;

const rollSchema = z.object({
  campaignId: z.string().cuid(),
  characterId: z.string().cuid().optional(),
  expression: z.string().min(2).max(80),
  label: z.string().max(120).optional(),
  visibility: z.enum(["dm_only", "roller_and_dm", "party_visible", "public"])
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = rollSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid roll request." }, { status: 400 });

  try {
    await requireCampaignMember(parsed.data.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  if (parsed.data.characterId) {
    const character = await prisma.character.findUnique({ where: { id: parsed.data.characterId } });
    if (!character || character.ownerId !== userId || character.campaignId !== parsed.data.campaignId) {
      return NextResponse.json({ error: "Character not available for this roll." }, { status: 403 });
    }
  }

  const result = rollDiceExpression(parsed.data.expression);
  const roll = await prisma.diceRoll.create({
    data: {
      campaignId: parsed.data.campaignId,
      characterId: parsed.data.characterId,
      rollerId: userId,
      expression: parsed.data.expression,
      label: parsed.data.label,
      visibility: visibilityMap[parsed.data.visibility],
      total: result.total,
      detail: result
    }
  });

  return NextResponse.json({ roll });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const campaignId = new URL(request.url).searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "Campaign is required." }, { status: 400 });

  let membership;
  try {
    membership = await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const isDm = hasDmPermission(membership.roles);
  const rolls = await prisma.diceRoll.findMany({
    where: isDm
      ? { campaignId }
      : {
          campaignId,
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "PARTY_VISIBLE" },
            { rollerId: userId },
            { revealedAt: { not: null } }
          ]
        },
    include: {
      roller: { select: { name: true, email: true } },
      character: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ rolls });
}
