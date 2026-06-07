import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { ensureCharacterWallet } from "@/lib/currency/transactions";
import { fromCopper, formatCurrency } from "@/lib/currency/conversion";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { characterId } = await params;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { campaign: { include: { members: true } } }
  });
  const membership = character?.campaign?.members.find((member) => member.userId === userId);
  const canView = character?.ownerId === userId || Boolean(membership && hasDmPermission(membership.roles));
  if (!character || !canView) return NextResponse.json({ error: "Character wallet access required." }, { status: 403 });

  const wallet = await ensureCharacterWallet(character.id);
  const transactions = await prisma.currencyTransaction.findMany({
    where: { characterId: character.id },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return NextResponse.json({
    wallet: {
      ...wallet,
      display: fromCopper(wallet.balanceCp),
      label: formatCurrency(wallet.balanceCp)
    },
    transactions
  });
}

