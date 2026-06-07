import { CurrencyTransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { toCopper } from "@/lib/currency/conversion";
import { prisma } from "@/lib/prisma";

const transferSchema = z.object({
  fromCharacterId: z.string().cuid(),
  toCharacterId: z.string().cuid(),
  amount: z.object({
    cp: z.number().int().min(0).default(0),
    sp: z.number().int().min(0).default(0),
    ep: z.number().int().min(0).default(0),
    gp: z.number().int().min(0).default(0),
    pp: z.number().int().min(0).default(0)
  }),
  note: z.string().max(500).optional()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = transferSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid currency transfer." }, { status: 400 });

  const amountCp = toCopper(parsed.data.amount);
  if (amountCp <= 0) return NextResponse.json({ error: "Transfer amount must be greater than zero." }, { status: 400 });
  if (parsed.data.fromCharacterId === parsed.data.toCharacterId) return NextResponse.json({ error: "Choose two different characters." }, { status: 400 });

  const [fromCharacter, toCharacter] = await Promise.all([
    prisma.character.findUnique({ where: { id: parsed.data.fromCharacterId }, include: { campaign: { include: { members: true } }, wallet: true } }),
    prisma.character.findUnique({ where: { id: parsed.data.toCharacterId }, include: { wallet: true } })
  ]);
  if (!fromCharacter || !toCharacter) return NextResponse.json({ error: "Character not found." }, { status: 404 });
  if (fromCharacter.campaignId !== toCharacter.campaignId) return NextResponse.json({ error: "Currency transfers must stay inside one campaign." }, { status: 400 });

  const membership = fromCharacter.campaign?.members.find((member) => member.userId === userId);
  const canTransfer = fromCharacter.ownerId === userId || Boolean(membership && hasDmPermission(membership.roles));
  if (!canTransfer) return NextResponse.json({ error: "You can only transfer from your own character or as a DM." }, { status: 403 });
  if ((fromCharacter.wallet?.balanceCp ?? 0) < amountCp) return NextResponse.json({ error: "Insufficient funds." }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const fromWallet = await tx.characterWallet.upsert({
      where: { characterId: fromCharacter.id },
      update: { balanceCp: { decrement: amountCp } },
      create: { characterId: fromCharacter.id, balanceCp: -amountCp }
    });
    const toWallet = await tx.characterWallet.upsert({
      where: { characterId: toCharacter.id },
      update: { balanceCp: { increment: amountCp } },
      create: { characterId: toCharacter.id, balanceCp: amountCp }
    });
    const metadata = { fromCharacterId: fromCharacter.id, toCharacterId: toCharacter.id };
    const outgoing = await tx.currencyTransaction.create({
      data: {
        campaignId: fromCharacter.campaignId,
        characterId: fromCharacter.id,
        actorId: userId,
        type: CurrencyTransactionType.TRANSFER,
        amountCp: -amountCp,
        note: parsed.data.note,
        metadata,
        appliedAt: new Date()
      }
    });
    const incoming = await tx.currencyTransaction.create({
      data: {
        campaignId: fromCharacter.campaignId,
        characterId: toCharacter.id,
        actorId: userId,
        type: CurrencyTransactionType.TRANSFER,
        amountCp,
        note: parsed.data.note,
        metadata,
        appliedAt: new Date()
      }
    });
    return { fromWallet, toWallet, outgoing, incoming };
  });

  return NextResponse.json(result);
}

