import { MapSourceType, MapVisibility, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { blueprintToMapLayers, validateMapBlueprint } from "@/lib/maps/blueprint-schema";
import { dungeonScrawlImporter } from "@/lib/maps/importers/dungeon-scrawl";
import { prisma } from "@/lib/prisma";
import { validateDungeonScrawlUpload } from "@/lib/uploads";

function stringFromForm(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanFromForm(value: FormDataEntryValue | null) {
  return value === "true" || value === "1" || value === "on";
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required to import campaign maps." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a Dungeon Scrawl .ds project file." }, { status: 400 });

  const validation = validateDungeonScrawlUpload(file);
  if (!validation.valid) return NextResponse.json({ error: validation.message }, { status: 400 });

  const sessionId = stringFromForm(formData.get("sessionId"));
  if (sessionId) {
    const session = await prisma.campaignSession.findFirst({ where: { id: sessionId, campaignId }, select: { id: true } });
    if (!session) return NextResponse.json({ error: "Session does not belong to this campaign." }, { status: 400 });
  }

  let imported;
  try {
    imported = dungeonScrawlImporter.parse({
      fileName: file.name,
      text: await file.text(),
      fallbackName: stringFromForm(formData.get("name"))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not parse Dungeon Scrawl project." }, { status: 400 });
  }

  const blueprintValidation = validateMapBlueprint(imported.blueprint);
  if (!blueprintValidation.valid) return NextResponse.json({ error: blueprintValidation.error }, { status: 400 });
  const warnings = [...imported.warnings, ...blueprintValidation.warnings];
  const shouldSave = booleanFromForm(formData.get("confirm")) || booleanFromForm(formData.get("save"));

  if (!shouldSave) {
    return NextResponse.json({
      preview: {
        sourceType: imported.sourceType,
        sourceFileName: imported.sourceFileName,
        importVersion: imported.importVersion,
        name: imported.blueprint.name,
        description: imported.blueprint.description,
        grid: imported.blueprint.grid,
        summary: imported.summary,
        warnings,
        successPercentage: imported.successPercentage
      }
    });
  }

  const map = await prisma.map.create({
    data: {
      campaignId,
      sessionId,
      name: imported.blueprint.name,
      description: imported.blueprint.description,
      gridType: "SQUARE",
      width: imported.blueprint.grid.width,
      height: imported.blueprint.grid.height,
      gridWidth: imported.blueprint.grid.width,
      gridHeight: imported.blueprint.grid.height,
      gridSize: imported.blueprint.grid.cellSize ?? 70,
      sourceType: MapSourceType.DUNGEON_SCRAWL,
      visibility: MapVisibility.CAMPAIGN_ONLY,
      sourceFileName: imported.sourceFileName,
      importWarnings: warnings as Prisma.InputJsonValue,
      importVersion: imported.importVersion,
      importedAt: new Date(),
      importedByUserId: userId,
      editorState: {
        zoom: 1,
        pan: { x: 0, y: 0 },
        selectedTool: "select",
        showGrid: true,
        import: {
          sourceType: imported.sourceType,
          sourceFileName: imported.sourceFileName,
          importVersion: imported.importVersion ?? null,
          importedAt: new Date().toISOString(),
          importedByUserId: userId,
          warnings,
          summary: imported.summary,
          successPercentage: imported.successPercentage,
          rawMetadata: imported.rawMetadata
        }
      } as Prisma.InputJsonValue,
      interactiveNotes: imported.blueprint.dmNotes,
      lightingNotes: imported.blueprint.lightingNotes,
      encounterSuggestions: imported.blueprint.suggestedEncounters as Prisma.InputJsonValue,
      spawnPoints: imported.blueprint.spawnPoints as Prisma.InputJsonValue,
      createdById: userId,
      layers: {
        create: blueprintToMapLayers(blueprintValidation.blueprint).map((layer) => ({
          name: layer.name,
          order: layer.order,
          visible: layer.visible,
          locked: layer.locked,
          data: layer.data as Prisma.InputJsonValue
        }))
      }
    },
    include: { layers: true, tags: true, images: true, tokens: true }
  });

  await prisma.mapFogState.upsert({
    where: { campaignId_mapId: { campaignId, mapId: map.id } },
    create: { campaignId, mapId: map.id },
    update: {}
  });

  await createActivity({
    campaignId,
    actorId: userId,
    type: "MAP_UPDATED",
    metadata: { mapId: map.id, mapName: map.name, sourceType: map.sourceType, dungeonScrawlImport: true, summary: imported.summary }
  });

  return NextResponse.json({ map, warnings, summary: imported.summary, successPercentage: imported.successPercentage }, { status: 201 });
}
