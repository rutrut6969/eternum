import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission, requireCampaignDm, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  activeMapId: z.string().cuid().nullable().optional(),
  activeSessionId: z.string().cuid().nullable().optional(),
  fogEnabled: z.boolean().optional(),
  gridEnabled: z.boolean().optional(),
  revealedRegions: z.array(z.unknown()).optional(),
  hiddenRegions: z.array(z.unknown()).optional()
});

function visibleTokenWhere(isDm: boolean, userId: string) {
  if (isDm) return {};
  return {
    OR: [
      { hidden: false, visibility: { not: "DM_ONLY" } },
      { ownerUserId: userId }
    ]
  };
}

async function getState(campaignId: string, userId: string, isDm: boolean) {
  const liveState = await prisma.campaignLiveState.upsert({
    where: { campaignId },
    update: {},
    create: { campaignId }
  });

  const activeMap = liveState.activeMapId
    ? await prisma.map.findFirst({
        where: { id: liveState.activeMapId, campaignId },
        include: {
          images: { orderBy: { createdAt: "desc" } },
          tags: true,
          layers: { orderBy: { order: "asc" } },
          tokens: { where: visibleTokenWhere(isDm, userId), include: { character: { select: { id: true, name: true, ownerId: true } } } }
        }
      })
    : null;

  const fogState = activeMap
    ? await prisma.mapFogState.upsert({
        where: { campaignId_mapId: { campaignId, mapId: activeMap.id } },
        update: { enabled: liveState.fogEnabled },
        create: { campaignId, mapId: activeMap.id, enabled: liveState.fogEnabled }
      })
    : null;

  return { liveState, activeMap, fogState };
}

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
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
  const state = await getState(campaignId, userId, isDm);
  return NextResponse.json({ ...state, isDm });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid live state update." }, { status: 400 });

  if (parsed.data.activeMapId) {
    const map = await prisma.map.findFirst({ where: { id: parsed.data.activeMapId, campaignId }, select: { id: true, name: true } });
    if (!map) return NextResponse.json({ error: "Map does not belong to this campaign." }, { status: 400 });
  }

  if (parsed.data.activeSessionId) {
    const session = await prisma.campaignSession.findFirst({ where: { id: parsed.data.activeSessionId, campaignId }, select: { id: true } });
    if (!session) return NextResponse.json({ error: "Session does not belong to this campaign." }, { status: 400 });
  }

  const liveState = await prisma.campaignLiveState.upsert({
    where: { campaignId },
    update: {
      activeMapId: parsed.data.activeMapId,
      activeSessionId: parsed.data.activeSessionId,
      fogEnabled: parsed.data.fogEnabled,
      gridEnabled: parsed.data.gridEnabled,
      metadata: { lastUpdatedBy: userId } as Prisma.InputJsonValue
    },
    create: {
      campaignId,
      activeMapId: parsed.data.activeMapId ?? undefined,
      activeSessionId: parsed.data.activeSessionId ?? undefined,
      fogEnabled: parsed.data.fogEnabled ?? false,
      gridEnabled: parsed.data.gridEnabled ?? true,
      metadata: { lastUpdatedBy: userId } as Prisma.InputJsonValue
    }
  });

  if (liveState.activeMapId && (parsed.data.fogEnabled !== undefined || parsed.data.revealedRegions || parsed.data.hiddenRegions)) {
    await prisma.mapFogState.upsert({
      where: { campaignId_mapId: { campaignId, mapId: liveState.activeMapId } },
      update: {
        enabled: parsed.data.fogEnabled,
        revealedRegions: parsed.data.revealedRegions as Prisma.InputJsonValue | undefined,
        hiddenRegions: parsed.data.hiddenRegions as Prisma.InputJsonValue | undefined,
        updatedById: userId
      },
      create: {
        campaignId,
        mapId: liveState.activeMapId,
        enabled: parsed.data.fogEnabled ?? liveState.fogEnabled,
        revealedRegions: (parsed.data.revealedRegions ?? []) as Prisma.InputJsonValue,
        hiddenRegions: (parsed.data.hiddenRegions ?? []) as Prisma.InputJsonValue,
        updatedById: userId
      }
    });
  }

  if (parsed.data.activeMapId !== undefined) {
    await createActivity({
      campaignId,
      actorId: userId,
      type: "MAP_UPDATED",
      metadata: { activeMapId: parsed.data.activeMapId, action: "active_map_changed" }
    });
  }
  if (parsed.data.fogEnabled !== undefined || parsed.data.revealedRegions || parsed.data.hiddenRegions) {
    await createActivity({
      campaignId,
      actorId: userId,
      type: "FOG_UPDATED",
      metadata: { activeMapId: liveState.activeMapId, fogEnabled: liveState.fogEnabled }
    });
  }

  const state = await getState(campaignId, userId, true);
  return NextResponse.json({ ...state, isDm: true });
}
