import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { splitCopper, toCopper } from "@/lib/currency/conversion";
import { prisma } from "@/lib/prisma";

const splitSchema = z.object({
  campaignId: z.string().cuid(),
  characterIds: z.array(z.string().cuid()).min(1).max(20),
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
  const parsed = splitSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid split request." }, { status: 400 });

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: parsed.data.campaignId, userId } }
  });
  if (!membership || !hasDmPermission(membership.roles)) return NextResponse.json({ error: "DM permission required." }, { status: 403 });

  const amountCp = toCopper(parsed.data.amount);
  const { share, remainder } = splitCopper(amountCp, parsed.data.characterIds.length);
  if (share <= 0) return NextResponse.json({ error: "Split amount is too small." }, { status: 400 });

  const characters = await prisma.character.findMany({
    where: { id: { in: parsed.data.characterIds }, campaignId: parsed.data.campaignId },
    select: { id: true }
  });
  if (characters.length !== parsed.data.characterIds.length) return NextResponse.json({ error: "All split recipients must belong to the campaign." }, { status: 400 });

  const transactions = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const character of characters) {
      await tx.characterWallet.upsert({
        where: { characterId: character.id },
        update: { balanceCp: { increment: share } },
        create: { characterId: character.id, balanceCp: share }
      });
      created.push(await tx.currencyTransaction.create({
        data: {
          campaignId: parsed.data.campaignId,
          characterId: character.id,
          actorId: userId,
          type: "SPLIT",
          amountCp: share,
          note: parsed.data.note || "Party currency split",
          metadata: { totalCp: amountCp, shareCp: share, remainderCp: remainder },
          appliedAt: new Date()
        }
      }));
    }
    return created;
  });

  return NextResponse.json({ shareCp: share, remainderCp: remainder, transactions });
}

