import { MapGridType, MapSourceType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { mapLayerDataSchema } from "@/lib/maps/blueprint-schema";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

const layerUpdateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  order: z.number().int().min(0),
  visible: z.boolean(),
  locked: z.boolean(),
  data: mapLayerDataSchema
});

const updateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  sourceType: z.nativeEnum(MapSourceType).optional(),
  gridType: z.nativeEnum(MapGridType).optional(),
  gridWidth: z.number().int().min(5).max(200).optional(),
  gridHeight: z.number().int().min(5).max(200).optional(),
  theme: z.string().max(80).nullable().optional(),
  environment: z.string().max(80).nullable().optional(),
  interactiveNotes: z.string().max(4000).nullable().optional(),
  lightingNotes: z.string().max(4000).nullable().optional(),
  editorState: z.record(z.unknown()).optional(),
  layers: z.array(layerUpdateSchema).min(1).max(20).optional()
});

async function getMapAccess(mapId: string, userId: string) {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { campaign: { include: { members: true } }, layers: { orderBy: { order: "asc" } }, images: true, tags: true }
  });
  if (!map) return { map: null, canView: false, canEdit: false };

  const isFounder = await subscriptionService.isFounder(userId);
  const membership = map.campaign?.members.find((member) => member.userId === userId);
  const campaignDm = membership ? hasDmPermission(membership.roles) : false;
  const canView = isFounder || map.createdById === userId || Boolean(membership) || (map.visibility === "PUBLIC_LIBRARY" && map.approvalStatus === "APPROVED_PUBLIC");
  const canEdit = isFounder || map.createdById === userId || campaignDm;

  return { map, canView, canEdit };
}

export async function GET(_request: Request, { params }: { params: Promise<{ mapId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mapId } = await params;
  const access = await getMapAccess(mapId, userId);

  if (!access.map) return NextResponse.json({ error: "Map not found." }, { status: 404 });
  if (!access.canView) return NextResponse.json({ error: "Map access required." }, { status: 403 });

  return NextResponse.json({ map: access.map, canEdit: access.canEdit });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ mapId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mapId } = await params;
  const access = await getMapAccess(mapId, userId);

  if (!access.map) return NextResponse.json({ error: "Map not found." }, { status: 404 });
  if (!access.canEdit) return NextResponse.json({ error: "Map edit permission required." }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid map update." }, { status: 400 });
  const nextWidth = parsed.data.gridWidth ?? access.map.gridWidth;
  const nextHeight = parsed.data.gridHeight ?? access.map.gridHeight;

  const map = await prisma.$transaction(async (tx) => {
    if (parsed.data.layers) {
      await tx.mapLayer.deleteMany({ where: { mapId } });
      await tx.mapLayer.createMany({
        data: parsed.data.layers.map((layer) => ({
          mapId,
          name: layer.name,
          order: layer.order,
          visible: layer.visible,
          locked: layer.locked,
          data: layer.data as Prisma.InputJsonValue
        }))
      });
    }

    return tx.map.update({
      where: { id: mapId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        sourceType: parsed.data.sourceType,
        gridType: parsed.data.gridType,
        gridWidth: parsed.data.gridWidth,
        gridHeight: parsed.data.gridHeight,
        width: nextWidth,
        height: nextHeight,
        theme: parsed.data.theme,
        environment: parsed.data.environment,
        interactiveNotes: parsed.data.interactiveNotes,
        lightingNotes: parsed.data.lightingNotes,
        editorState: parsed.data.editorState as Prisma.InputJsonValue | undefined
      },
      include: { layers: { orderBy: { order: "asc" } }, images: true, tags: true }
    });
  });

  return NextResponse.json({ map });
}

