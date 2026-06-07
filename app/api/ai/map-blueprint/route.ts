import { MapSourceType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { authOptions } from "@/lib/auth/options";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { blueprintToMapLayers, validateMapBlueprint } from "@/lib/maps/blueprint-schema";
import { buildEditableMapBlueprintPrompt } from "@/lib/maps/prompt-templates";
import { prisma } from "@/lib/prisma";
import { recordAIUsage, subscriptionService } from "@/lib/subscriptions/service";

const requestSchema = z.object({
  prompt: z.string().min(20).max(4000),
  campaignId: z.string().cuid().optional(),
  sessionId: z.string().cuid().optional(),
  width: z.number().int().min(5).max(200).default(30),
  height: z.number().int().min(5).max(200).default(30),
  theme: z.string().max(80).optional(),
  environment: z.string().max(80).optional(),
  saveDraft: z.boolean().default(false)
});

function parseJsonObject(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid map blueprint request." }, { status: 400 });

  const canGenerateMaps = await subscriptionService.canUseFutureMapGeneration(userId);
  if (!canGenerateMaps) {
    return NextResponse.json({ error: "AI map blueprint generation requires a Worldbuilder or Founder plan." }, { status: 403 });
  }

  const isFounder = await subscriptionService.isFounder(userId);
  if (parsed.data.campaignId && !isFounder) {
    try {
      await requireCampaignDm(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "DM permission required for campaign map generation." }, { status: 403 });
    }
  }

  if (parsed.data.sessionId && parsed.data.campaignId) {
    const sessionRecord = await prisma.campaignSession.findFirst({
      where: { id: parsed.data.sessionId, campaignId: parsed.data.campaignId },
      select: { id: true }
    });
    if (!sessionRecord) return NextResponse.json({ error: "Session does not belong to this campaign." }, { status: 400 });
  }

  await recordAIUsage(userId);

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: openAIModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You create original, editable VTT map blueprints as strict JSON. You do not copy existing map tools, brands, layouts, assets, or code."
        },
        {
          role: "user",
          content: buildEditableMapBlueprintPrompt({
            prompt: parsed.data.prompt,
            width: parsed.data.width,
            height: parsed.data.height,
            theme: parsed.data.theme,
            environment: parsed.data.environment,
            gridType: "square"
          })
        }
      ]
    });

    const raw = completion.choices[0]?.message.content || "{}";
    const validation = validateMapBlueprint(parseJsonObject(raw));
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 422 });

    let map = null;
    if (parsed.data.saveDraft) {
      map = await prisma.map.create({
        data: {
          campaignId: parsed.data.campaignId,
          sessionId: parsed.data.sessionId,
          name: validation.blueprint.name,
          description: validation.blueprint.description,
          sourceType: MapSourceType.AI_BLUEPRINT,
          blueprintVersion: validation.blueprint.version,
          editorState: { zoom: 1, pan: { x: 0, y: 0 }, selectedTool: "select", showGrid: true },
          gridType: "SQUARE",
          width: validation.blueprint.grid.width,
          height: validation.blueprint.grid.height,
          gridWidth: validation.blueprint.grid.width,
          gridHeight: validation.blueprint.grid.height,
          gridSize: validation.blueprint.grid.cellSize ?? 70,
          theme: validation.blueprint.theme ?? parsed.data.theme,
          environment: parsed.data.environment,
          prompt: parsed.data.prompt,
          interactiveNotes: validation.blueprint.dmNotes,
          spawnPoints: validation.blueprint.spawnPoints as Prisma.InputJsonValue,
          lightingNotes: validation.blueprint.lightingNotes,
          encounterSuggestions: validation.blueprint.suggestedEncounters as Prisma.InputJsonValue,
          visibility: parsed.data.campaignId ? "CAMPAIGN_ONLY" : "PRIVATE_USER",
          createdById: userId,
          layers: {
            create: blueprintToMapLayers(validation.blueprint).map((layer) => ({
              ...layer,
              data: layer.data as Prisma.InputJsonValue
            }))
          }
        },
        include: { layers: true }
      });
    }

    return NextResponse.json({ blueprint: validation.blueprint, warnings: validation.warnings, map });
  } catch (error) {
    console.error("AI map blueprint generation failed", error);
    return NextResponse.json({ error: "AI map blueprint generation is temporarily unavailable." }, { status: 500 });
  }
}

