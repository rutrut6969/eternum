import { put } from "@vercel/blob";
import { MapGridType, MapSourceType, MapVisibility, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { validateMapImageUpload } from "@/lib/uploads";

function numberFromForm(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringFromForm(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required to upload campaign maps." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const validation = validateMapImageUpload(file instanceof File ? file : null);
  if (!validation.valid || !(file instanceof File)) {
    return NextResponse.json({ error: validation.message || "Invalid map image." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 500 });
  }

  const name = stringFromForm(formData.get("name")) ?? file.name.replace(/\.[^.]+$/, "");
  const description = stringFromForm(formData.get("description"));
  const gridTypeText = stringFromForm(formData.get("gridType")) ?? "SQUARE";
  const gridType = Object.values(MapGridType).includes(gridTypeText as MapGridType) ? (gridTypeText as MapGridType) : MapGridType.SQUARE;
  const gridWidth = Math.max(1, Math.min(300, Math.round(numberFromForm(formData.get("gridWidth"), 30))));
  const gridHeight = Math.max(1, Math.min(300, Math.round(numberFromForm(formData.get("gridHeight"), 30))));
  const pixelsPerCell = Math.max(1, Math.min(512, Math.round(numberFromForm(formData.get("pixelsPerCell"), 70))));
  const gridOffsetX = Math.round(numberFromForm(formData.get("gridOffsetX"), 0));
  const gridOffsetY = Math.round(numberFromForm(formData.get("gridOffsetY"), 0));
  const imageWidth = Math.max(0, Math.round(numberFromForm(formData.get("imageWidth"), 0))) || undefined;
  const imageHeight = Math.max(0, Math.round(numberFromForm(formData.get("imageHeight"), 0))) || undefined;
  const imageAltText = stringFromForm(formData.get("imageAltText")) ?? name;
  const source = stringFromForm(formData.get("source")) ?? "uploaded";
  const sessionId = stringFromForm(formData.get("sessionId"));

  if (sessionId) {
    const session = await prisma.campaignSession.findFirst({ where: { id: sessionId, campaignId }, select: { id: true } });
    if (!session) return NextResponse.json({ error: "Session does not belong to this campaign." }, { status: 400 });
  }

  const blob = await put(`maps/${campaignId}/${Date.now()}-${safeFileName(file.name)}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  const editorState = {
    zoom: 1,
    pan: { x: 0, y: 0 },
    showGrid: gridType !== MapGridType.NONE,
    uploadedMap: {
      gridOffsetX,
      gridOffsetY,
      pixelsPerCell,
      imageWidth,
      imageHeight,
      source
    }
  };

  const map = await prisma.map.create({
    data: {
      campaignId,
      sessionId,
      name,
      description,
      sourceType: MapSourceType.UPLOAD,
      visibility: MapVisibility.CAMPAIGN_ONLY,
      gridType,
      width: gridWidth,
      height: gridHeight,
      gridWidth,
      gridHeight,
      gridSize: pixelsPerCell,
      editorState: editorState as Prisma.InputJsonValue,
      interactiveNotes: stringFromForm(formData.get("notes")),
      createdById: userId,
      images: {
        create: {
          imageUrl: blob.url,
          imageAltText,
          generatedByAi: false,
          blobPath: blob.pathname,
          width: imageWidth,
          height: imageHeight
        }
      },
      layers: {
        create: [
          { name: "Map Image", order: 0, visible: true, locked: true, data: { elements: [] } },
          { name: "Tokens", order: 1, visible: true, locked: false, data: { elements: [] } },
          { name: "Fog Notes", order: 2, visible: true, locked: false, data: { elements: [] } }
        ]
      }
    },
    include: { images: true, layers: true, tags: true, tokens: true }
  });

  await prisma.mapFogState.upsert({
    where: { campaignId_mapId: { campaignId, mapId: map.id } },
    update: { enabled: false, updatedById: userId },
    create: { campaignId, mapId: map.id, enabled: false, updatedById: userId }
  });

  await createActivity({
    campaignId,
    actorId: userId,
    type: "MAP_UPDATED",
    metadata: { mapId: map.id, mapName: map.name, sourceType: map.sourceType, upload: true }
  });

  return NextResponse.json({ map }, { status: 201 });
}
