import { MapGridType, MapSourceType, MapVisibility, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

const mapCreateSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  campaignId: z.string().cuid().optional(),
  sessionId: z.string().cuid().optional(),
  gridType: z.nativeEnum(MapGridType).default("SQUARE"),
  gridWidth: z.number().int().min(1).max(200).default(30),
  gridHeight: z.number().int().min(1).max(200).default(30),
  recommendedPartyLevel: z.number().int().min(1).max(30).optional(),
  environment: z.string().max(80).optional(),
  theme: z.string().max(80).optional(),
  prompt: z.string().max(4000).optional(),
  sourceType: z.nativeEnum(MapSourceType).default("MANUAL"),
  editorState: z.record(z.unknown()).default({}),
  interactiveNotes: z.string().max(4000).optional(),
  lightingNotes: z.string().max(4000).optional(),
  encounterSuggestions: z.array(z.unknown()).default([]),
  spawnPoints: z.array(z.unknown()).default([]),
  tags: z.array(z.string().min(1).max(40)).default([])
});

const defaultMapLayers = ["Terrain", "Structures", "Objects", "Lighting Notes", "Spawn Points", "DM Notes"];

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = clean(valueOf(params.get("q") ?? undefined));
  const environment = clean(valueOf(params.get("environment") ?? undefined));
  const theme = clean(valueOf(params.get("theme") ?? undefined));
  const gridType = clean(valueOf(params.get("gridType") ?? undefined));
  const creator = clean(valueOf(params.get("creator") ?? undefined));
  const size = clean(valueOf(params.get("size") ?? undefined));
  const safeGridType = gridType && Object.values(MapGridType).includes(gridType as MapGridType) ? (gridType as MapGridType) : undefined;

  const where: Prisma.MapWhereInput = {
    approvalStatus: "APPROVED_PUBLIC",
    visibility: "PUBLIC_LIBRARY",
    ...(safeGridType ? { gridType: safeGridType } : {}),
    ...(environment ? { environment } : {}),
    ...(theme ? { theme } : {})
  };

  try {
    const maps = await prisma.map.findMany({
      where,
      include: {
        createdBy: { select: { name: true, username: true } },
        images: { orderBy: { createdAt: "desc" }, take: 1 },
        tags: true
      },
      orderBy: { publishedAt: "desc" },
      take: 100
    });

    const filtered = maps
      .filter((map) => !query || `${map.name} ${map.description ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      .filter((map) => !creator || `${map.createdBy.name ?? ""} ${map.createdBy.username}`.toLowerCase().includes(creator.toLowerCase()))
      .filter((map) => !size || `${map.gridWidth}x${map.gridHeight}` === size.toLowerCase())
      .slice(0, 60);

    return NextResponse.json({ maps: filtered });
  } catch (error) {
    console.error("Public map library query failed", error);
    return NextResponse.json({ error: "Map library is temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = mapCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid map details." }, { status: 400 });

  const isFounder = await subscriptionService.isFounder(userId);
  if (parsed.data.campaignId && !isFounder) {
    try {
      await requireCampaignDm(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "DM permission required for campaign maps." }, { status: 403 });
    }
  }

  if (parsed.data.sessionId && parsed.data.campaignId) {
    const session = await prisma.campaignSession.findFirst({
      where: { id: parsed.data.sessionId, campaignId: parsed.data.campaignId },
      select: { id: true }
    });
    if (!session) return NextResponse.json({ error: "Session does not belong to this campaign." }, { status: 400 });
  }

  const map = await prisma.map.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      campaignId: parsed.data.campaignId,
      sessionId: parsed.data.sessionId,
      gridType: parsed.data.gridType,
      gridWidth: parsed.data.gridWidth,
      gridHeight: parsed.data.gridHeight,
      width: parsed.data.gridWidth,
      height: parsed.data.gridHeight,
      recommendedPartyLevel: parsed.data.recommendedPartyLevel,
      environment: parsed.data.environment,
      theme: parsed.data.theme,
      prompt: parsed.data.prompt,
      sourceType: parsed.data.sourceType,
      editorState: parsed.data.editorState as Prisma.InputJsonValue,
      interactiveNotes: parsed.data.interactiveNotes,
      lightingNotes: parsed.data.lightingNotes,
      encounterSuggestions: parsed.data.encounterSuggestions as Prisma.InputJsonValue,
      spawnPoints: parsed.data.spawnPoints as Prisma.InputJsonValue,
      visibility: parsed.data.campaignId ? MapVisibility.CAMPAIGN_ONLY : MapVisibility.PRIVATE_USER,
      createdById: userId,
      tags: { create: parsed.data.tags.map((label) => ({ label })) },
      layers: { create: defaultMapLayers.map((name, order) => ({ name, order, visible: true, locked: false, data: { elements: [] } })) }
    },
    include: { tags: true, layers: true }
  });

  return NextResponse.json({ map }, { status: 201 });
}
