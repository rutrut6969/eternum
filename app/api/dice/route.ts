import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
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

  const parsed = rollSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid roll request." }, { status: 400 });

  const result = rollDiceExpression(parsed.data.expression);
  const roll = await prisma.diceRoll.create({
    data: {
      campaignId: parsed.data.campaignId,
      characterId: parsed.data.characterId,
      rollerId: session.user.id,
      expression: parsed.data.expression,
      label: parsed.data.label,
      visibility: visibilityMap[parsed.data.visibility],
      total: result.total,
      detail: result
    }
  });

  return NextResponse.json({ roll });
}
