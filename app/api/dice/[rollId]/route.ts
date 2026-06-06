import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_request: Request, { params }: { params: Promise<{ rollId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rollId } = await params;

  const roll = await prisma.diceRoll.findUnique({ where: { id: rollId } });
  if (!roll) return NextResponse.json({ error: "Roll not found." }, { status: 404 });

  try {
    await requireCampaignDm(roll.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const revealed = await prisma.diceRoll.update({
    where: { id: roll.id },
    data: { revealedAt: new Date(), visibility: "PARTY_VISIBLE" }
  });

  return NextResponse.json({ roll: revealed });
}
