import { notFound } from "next/navigation";
import { LiveTabletopShell } from "@/components/campaigns/live-tabletop-shell";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function CampaignPlayPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireUser();
  const { campaignId } = await params;
  const isFounder = await subscriptionService.isFounder(user.id);
  const membership = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: user.id } } });
  if (!membership && !isFounder) notFound();

  const roles = membership?.roles ?? (isFounder ? (["DM", "PLAYER"] as const) : []);
  const isDm = isFounder || hasDmPermission([...roles]);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSessions: { where: { status: { not: "ARCHIVED" } }, orderBy: { sessionNumber: "desc" } },
      characters: { include: { owner: { select: { id: true, name: true, username: true } } } },
      maps: {
        include: {
          createdBy: { select: { name: true, username: true } },
          images: { orderBy: { createdAt: "desc" } },
          tags: true,
          layers: { orderBy: { order: "asc" } },
          tokens: { include: { character: { select: { id: true, name: true, ownerId: true } } } }
        },
        orderBy: { updatedAt: "desc" }
      },
      activityLogs: { include: { actor: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      liveState: true
    }
  });
  if (!campaign) notFound();

  const activeSession = campaign.campaignSessions.find((session) => session.status === "ACTIVE") ?? null;
  const liveState = campaign.liveState ?? await prisma.campaignLiveState.create({ data: { campaignId: campaign.id } });
  const activeMap = liveState.activeMapId ? campaign.maps.find((map) => map.id === liveState.activeMapId) ?? null : null;
  const fogState = activeMap
    ? await prisma.mapFogState.upsert({
        where: { campaignId_mapId: { campaignId: campaign.id, mapId: activeMap.id } },
        update: { enabled: liveState.fogEnabled },
        create: { campaignId: campaign.id, mapId: activeMap.id, enabled: liveState.fogEnabled }
      })
    : null;

  const maps = campaign.maps.map((map) => ({
    id: map.id,
    name: map.name,
    description: map.description,
    sourceType: map.sourceType,
    gridType: map.gridType,
    gridWidth: map.gridWidth,
    gridHeight: map.gridHeight,
    gridSize: map.gridSize,
    editorState: jsonObject(map.editorState),
    images: map.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      imageAltText: image.imageAltText,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt.toISOString()
    })),
    tags: map.tags.map((tag) => ({ label: tag.label })),
    layers: map.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      order: layer.order,
      visible: layer.visible,
      locked: layer.locked,
      data: layer.data
    })),
    tokens: map.tokens
      .filter((token) => isDm || (!token.hidden && token.visibility !== "DM_ONLY") || token.ownerUserId === user.id || token.character?.ownerId === user.id)
      .map((token) => ({
        id: token.id,
        mapId: token.mapId,
        characterId: token.characterId,
        kind: token.kind,
        name: token.name,
        imageUrl: token.imageUrl,
        x: token.x,
        y: token.y,
        width: token.width,
        height: token.height,
        rotation: token.rotation,
        visibility: token.visibility,
        ownerUserId: token.ownerUserId,
        controlledByUserIds: token.controlledByUserIds,
        hidden: token.hidden,
        locked: token.locked,
        character: token.character
      })),
    createdAt: map.createdAt.toISOString(),
    createdBy: map.createdBy
  }));

  const normalizedActiveMap = activeMap ? maps.find((map) => map.id === activeMap.id) ?? null : null;

  return (
    <LiveTabletopShell
      campaign={{ id: campaign.id, name: campaign.name }}
      userId={user.id}
      isDm={isDm}
      initialMaps={maps}
      initialLiveState={{
        liveState: {
          activeMapId: liveState.activeMapId,
          fogEnabled: liveState.fogEnabled,
          gridEnabled: liveState.gridEnabled,
          updatedAt: liveState.updatedAt.toISOString()
        },
        activeMap: normalizedActiveMap,
        fogState: fogState ? { enabled: fogState.enabled, revealedRegions: fogState.revealedRegions, hiddenRegions: fogState.hiddenRegions } : null,
        isDm
      }}
      activeSession={activeSession ? { id: activeSession.id, title: activeSession.title, status: activeSession.status } : null}
      characters={campaign.characters.map((character) => ({ id: character.id, name: character.name, campaignId: character.campaignId, ownerId: character.ownerId }))}
      activities={campaign.activityLogs.map((activity) => ({
        id: activity.id,
        type: activity.type,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
        actor: activity.actor
      }))}
    />
  );
}
