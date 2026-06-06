import { CampaignRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const characterSchema = z.object({
  campaignId: z.string().cuid(),
  name: z.string().min(2).max(120),
  ancestry: z.string().max(80).optional(),
  className: z.string().max(80).optional(),
  level: z.number().int().min(1).max(30).default(1),
  castingAbility: z.enum(["CHA", "INT", "WIS"]).optional(),
  backstory: z.string().max(8000).optional()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = characterSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid character details." }, { status: 400 });

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: parsed.data.campaignId, userId } }
  });
  if (!membership) return NextResponse.json({ error: "Join this campaign before creating a character." }, { status: 403 });

  if (!membership.roles.includes(CampaignRole.PLAYER)) {
    await prisma.campaignMember.update({
      where: { id: membership.id },
      data: { roles: { set: [...membership.roles, CampaignRole.PLAYER] } }
    });
  }

  const character = await prisma.character.create({
    data: {
      campaignId: parsed.data.campaignId,
      ownerId: userId,
      name: parsed.data.name,
      ancestry: parsed.data.ancestry,
      className: parsed.data.className,
      level: parsed.data.level,
      castingAbility: parsed.data.castingAbility,
      backstory: parsed.data.backstory
    }
  });

  await createActivity({
    campaignId: parsed.data.campaignId,
    actorId: userId,
    type: "CHARACTER_CREATED",
    metadata: { characterId: character.id, name: character.name }
  });

  return NextResponse.json({ character }, { status: 201 });
}
