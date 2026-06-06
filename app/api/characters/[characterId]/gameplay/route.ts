import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const gameplayFields = [
  "inventory",
  "learnedSpells",
  "customSpells",
  "craftedItems",
  "disciplines",
  "traits",
  "flaws",
  "affinities",
  "tamedCreatures",
  "undeadServants"
] as const;

const schema = z.object({
  field: z.enum(gameplayFields),
  action: z.enum(["add", "update", "remove", "replace"]),
  index: z.number().int().min(0).optional(),
  value: z.unknown().optional()
});

async function canEditCharacter(characterId: string, userId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { campaign: { include: { members: true } } }
  });
  if (!character) return null;
  if (character.ownerId === userId) return character;
  const membership = character.campaign?.members.find((member) => member.userId === userId);
  if (membership && hasDmPermission(membership.roles)) return character;
  return null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? [...value] : [];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ characterId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { characterId } = await params;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid gameplay update." }, { status: 400 });

  const character = await canEditCharacter(characterId, userId);
  if (!character) return NextResponse.json({ error: "Character edit permission required." }, { status: 403 });

  const current = asArray(character[parsed.data.field]);
  let next = current;

  if (parsed.data.action === "replace") {
    next = Array.isArray(parsed.data.value) ? parsed.data.value : [];
  }
  if (parsed.data.action === "add" && parsed.data.value !== undefined) {
    next = [...current, parsed.data.value];
  }
  if (parsed.data.action === "update" && parsed.data.index !== undefined && parsed.data.value !== undefined) {
    next = current.map((item, index) => (index === parsed.data.index ? parsed.data.value : item));
  }
  if (parsed.data.action === "remove" && parsed.data.index !== undefined) {
    next = current.filter((_item, index) => index !== parsed.data.index);
  }

  const updated = await prisma.character.update({
    where: { id: character.id },
    data: { [parsed.data.field]: next as Prisma.InputJsonValue }
  });

  return NextResponse.json({ character: updated });
}
