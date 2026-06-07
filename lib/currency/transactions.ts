import { CurrencyTransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function ensureCharacterWallet(characterId: string) {
  return prisma.characterWallet.upsert({
    where: { characterId },
    update: {},
    create: { characterId }
  });
}

export async function ensurePartyTreasury(campaignId: string) {
  return prisma.partyTreasury.upsert({
    where: { campaignId },
    update: {},
    create: { campaignId }
  });
}

export async function adjustCharacterWallet({
  characterId,
  campaignId,
  actorId,
  amountCp,
  type = CurrencyTransactionType.MANUAL_ADJUSTMENT,
  note,
  metadata = {}
}: {
  characterId: string;
  campaignId?: string | null;
  actorId?: string | null;
  amountCp: number;
  type?: CurrencyTransactionType;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.characterWallet.upsert({
      where: { characterId },
      update: { balanceCp: { increment: amountCp } },
      create: { characterId, balanceCp: amountCp }
    });

    const transaction = await tx.currencyTransaction.create({
      data: {
        characterId,
        campaignId,
        actorId,
        amountCp,
        type,
        status: "APPLIED",
        appliedAt: new Date(),
        note,
        metadata: metadata as Prisma.InputJsonValue
      }
    });

    return { wallet, transaction };
  });
}

