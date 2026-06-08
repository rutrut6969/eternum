import { Prisma, TokenKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const createTokenSchema = z.object({
  mapId: z.string().cuid(),
  characterId: z.string().cuid().optional(),
  kind: z.nativeEnum(TokenKind).default(TokenKind.CHARACTER),
  name: z.string().min(1).max(120),
  imageUrl: z.string().url().optional(),
  x: z.number().min(0).default(1),
  y: z.number().min(0).default(1),
  width: z.number().min(0.25).max(10).default(1),
  height: z.number().min(0.25).max(10).default(1),
  visibility: z.enum(["DM_ONLY", "PARTY_VISIBLE", "PUBLIC"]).default("PARTY_VISIBLE"),
  ownerUserId: z.string().cuid().optional(),
  controlledByUserIds: z.array(z.string().cuid()).default([])
});

const patchTokenSchema = z.object({
  tokenId: z.string().cuid(),
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
  width: z.number().min(0.25).max(10).optional(),
  height: z.number().min(0.25).max(10).optional(),
  rotation: z.number().optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  visibility: z.enum(["DM_ONLY", "PARTY_VISIBLE", "PUBLIC"]).optional(),
  ownerUserId: z.string().cuid().nullable().optional(),
  controlledByUserIds: z.array(z.string().cuid()).optional()
});

function controlledByList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function canControlToken({
  isDm,
  userId,
  token,
  characterOwnerId
}: {
  isDm: boolean;
  userId: string;
  token: { ownerUserId: string | null; controlledByUserIds: unknown; locked: boolean };
  characterOwnerId?: string | null;
}) {
  if (isDm) return true;
  if (token.locked) return false;
  if (token.ownerUserId === userId) return true;
  if (characterOwnerId === userId) return true;
  return controlledByList(token.controlledByUserIds).includes(userId);
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  let membership;
  try {
    membership = await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }
  if (!hasDmPermission(membership.roles)) return NextResponse.json({ error: "DM permission required to create tokens." }, { status: 403 });

  const parsed = createTokenSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid token." }, { status: 400 });

  const map = await prisma.map.findFirst({ where: { id: parsed.data.mapId, campaignId }, select: { id: true } });
  if (!map) return NextResponse.json({ error: "Map does not belong to this campaign." }, { status: 400 });

  const character = parsed.data.characterId
    ? await prisma.character.findFirst({ where: { id: parsed.data.characterId, campaignId }, select: { id: true, ownerId: true, name: true } })
    : null;
  if (parsed.data.characterId && !character) return NextResponse.json({ error: "Character does not belong to this campaign." }, { status: 400 });

  const token = await prisma.mapToken.create({
    data: {
      campaignId,
      mapId: parsed.data.mapId,
      characterId: parsed.data.characterId,
      kind: parsed.data.kind,
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl,
      x: parsed.data.x,
      y: parsed.data.y,
      width: parsed.data.width,
      height: parsed.data.height,
      size: Math.max(parsed.data.width, parsed.data.height),
      visibility: parsed.data.visibility,
      hidden: parsed.data.visibility === "DM_ONLY",
      ownerUserId: parsed.data.ownerUserId ?? character?.ownerId,
      controlledByUserIds: [...new Set([...(parsed.data.controlledByUserIds ?? []), ...(character?.ownerId ? [character.ownerId] : [])])] as Prisma.InputJsonValue,
      lastMovedAt: new Date()
    },
    include: { character: { select: { id: true, name: true, ownerId: true } } }
  });

  await createActivity({
    campaignId,
    actorId: userId,
    type: "TOKEN_MOVED",
    metadata: { tokenId: token.id, mapId: token.mapId, tokenName: token.name, action: "token_created", x: token.x, y: token.y }
  });

  return NextResponse.json({ token }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  let membership;
  try {
    membership = await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }
  const isDm = hasDmPermission(membership.roles);

  const parsed = patchTokenSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid token update." }, { status: 400 });

  const token = await prisma.mapToken.findFirst({
    where: { id: parsed.data.tokenId, campaignId },
    include: { character: { select: { ownerId: true } } }
  });
  if (!token) return NextResponse.json({ error: "Token not found." }, { status: 404 });

  const canControl = canControlToken({ isDm, userId, token, characterOwnerId: token.character?.ownerId });
  if (!canControl) return NextResponse.json({ error: "Token control required." }, { status: 403 });
  if (!isDm && (parsed.data.hidden !== undefined || parsed.data.locked !== undefined || parsed.data.visibility || parsed.data.ownerUserId !== undefined || parsed.data.controlledByUserIds)) {
    return NextResponse.json({ error: "DM permission required for token visibility or ownership changes." }, { status: 403 });
  }

  const updated = await prisma.mapToken.update({
    where: { id: token.id },
    data: {
      x: parsed.data.x,
      y: parsed.data.y,
      width: parsed.data.width,
      height: parsed.data.height,
      size: parsed.data.width || parsed.data.height ? Math.max(parsed.data.width ?? token.width, parsed.data.height ?? token.height) : undefined,
      rotation: parsed.data.rotation,
      hidden: parsed.data.hidden,
      locked: parsed.data.locked,
      visibility: parsed.data.visibility,
      ownerUserId: parsed.data.ownerUserId,
      controlledByUserIds: parsed.data.controlledByUserIds as Prisma.InputJsonValue | undefined,
      lastMovedAt: parsed.data.x !== undefined || parsed.data.y !== undefined ? new Date() : undefined
    },
    include: { character: { select: { id: true, name: true, ownerId: true } } }
  });

  await createActivity({
    campaignId,
    actorId: userId,
    type: "TOKEN_MOVED",
    metadata: { tokenId: updated.id, mapId: updated.mapId, tokenName: updated.name, action: "token_updated", x: updated.x, y: updated.y }
  });

  return NextResponse.json({ token: updated });
}
