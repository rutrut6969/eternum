import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  profession: z.string().min(2).max(80),
  level: z.number().int().min(0).max(100),
  xp: z.number().int().min(0).max(100000).default(0),
  remove: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { characterId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profession update." }, { status: 400 });

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { campaign: { include: { members: true } } }
  });
  const membership = character?.campaign?.members.find((member) => member.userId === userId);
  const canEdit = character?.ownerId === userId || (membership && hasDmPermission(membership.roles));
  if (!character || !canEdit) return NextResponse.json({ error: "Character edit permission required." }, { status: 403 });

  if (parsed.data.remove) {
    await prisma.professionProgress.deleteMany({
      where: { characterId, profession: parsed.data.profession }
    });
  } else {
    await prisma.professionProgress.upsert({
      where: { characterId_profession: { characterId, profession: parsed.data.profession } },
      create: { characterId, profession: parsed.data.profession, level: parsed.data.level, xp: parsed.data.xp },
      update: { level: parsed.data.level, xp: parsed.data.xp }
    });
  }

  const professions = await prisma.professionProgress.findMany({ where: { characterId }, orderBy: { profession: "asc" } });
  return NextResponse.json({ professions });
}
