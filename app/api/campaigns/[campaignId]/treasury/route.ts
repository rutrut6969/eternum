import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { ensurePartyTreasury } from "@/lib/currency/transactions";
import { fromCopper, formatCurrency } from "@/lib/currency/conversion";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } }
  });
  if (!membership) return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });

  const treasury = await ensurePartyTreasury(campaignId);
  const transactions = await prisma.currencyTransaction.findMany({
    where: { treasuryId: treasury.id },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return NextResponse.json({
    treasury: {
      ...treasury,
      display: fromCopper(treasury.balanceCp),
      label: formatCurrency(treasury.balanceCp),
      canManage: hasDmPermission(membership.roles)
    },
    transactions
  });
}

