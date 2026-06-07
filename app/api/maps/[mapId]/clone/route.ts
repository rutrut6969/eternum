import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const cloneSchema = z.object({
  campaignId: z.string().cuid(),
  sessionId: z.string().cuid().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ mapId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = cloneSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid clone request." }, { status: 400 });

  try {
    await requireCampaignDm(parsed.data.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const { mapId } = await params;
  const source = await prisma.map.findFirst({
    where: { id: mapId, approvalStatus: "APPROVED_PUBLIC", visibility: "PUBLIC_LIBRARY" },
    include: { images: true, tags: true, layers: true }
  });

  if (!source) return NextResponse.json({ error: "Public map not found." }, { status: 404 });

  const clone = await prisma.map.create({
    data: {
      campaignId: parsed.data.campaignId,
      sessionId: parsed.data.sessionId,
      name: `${source.name} (imported)`,
      description: source.description,
      visibility: "CAMPAIGN_ONLY",
      approvalStatus: "APPROVED_PRIVATE",
      sourceType: source.sourceType,
      blueprintVersion: source.blueprintVersion,
      editorState: (source.editorState ?? {}) as Prisma.InputJsonValue,
      gridType: source.gridType,
      width: source.width,
      height: source.height,
      gridWidth: source.gridWidth,
      gridHeight: source.gridHeight,
      gridSize: source.gridSize,
      recommendedPartyLevel: source.recommendedPartyLevel,
      environment: source.environment,
      theme: source.theme,
      prompt: source.prompt,
      interactiveNotes: source.interactiveNotes,
      spawnPoints: (source.spawnPoints ?? []) as Prisma.InputJsonValue,
      lightingNotes: source.lightingNotes,
      encounterSuggestions: (source.encounterSuggestions ?? []) as Prisma.InputJsonValue,
      createdById: userId,
      images: {
        create: source.images.map((image) => ({
          imageUrl: image.imageUrl,
          imagePrompt: image.imagePrompt,
          imageAltText: image.imageAltText,
          generatedByAi: image.generatedByAi,
          blobPath: image.blobPath,
          width: image.width,
          height: image.height
        }))
      },
      tags: { create: source.tags.map((tag) => ({ label: tag.label, category: tag.category })) },
      layers: { create: source.layers.map((layer) => ({ name: layer.name, order: layer.order, visible: layer.visible, locked: layer.locked, data: (layer.data ?? {}) as Prisma.InputJsonValue })) }
    },
    include: { images: true, tags: true, layers: true }
  });

  return NextResponse.json({ map: clone }, { status: 201 });
}
