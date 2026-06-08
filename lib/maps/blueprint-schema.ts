import { z } from "zod";

export const mapElementTypes = [
  "room",
  "corridor",
  "wall",
  "door",
  "window",
  "stairs",
  "terrain",
  "obstacle",
  "spawn_point",
  "secret_area",
  "label",
  "lighting_note"
] as const;

export const mapNoteVisibilities = ["DM_ONLY", "PUBLIC"] as const;

const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

const boundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive()
});

export const mapElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(mapElementTypes),
  name: z.string().max(120).optional(),
  bounds: boundsSchema.optional(),
  points: z.array(pointSchema).optional(),
  position: pointSchema.optional(),
  terrainType: z.string().max(60).optional(),
  orientation: z.enum(["north", "east", "south", "west"]).optional(),
  rotation: z.number().default(0).optional(),
  open: z.boolean().optional(),
  locked: z.boolean().optional(),
  secret: z.boolean().optional(),
  blocksMovement: z.boolean().optional(),
  blocksVision: z.boolean().optional(),
  note: z.string().max(1000).optional(),
  label: z.string().max(120).optional(),
  visibility: z.enum(mapNoteVisibilities).default("DM_ONLY"),
  metadata: z.record(z.unknown()).default({})
});

export const mapLayerDataSchema = z.object({
  elements: z.array(mapElementSchema).default([])
});

export const mapBlueprintLayerSchema = z.object({
  name: z.string().min(1).max(80),
  order: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  elements: z.array(mapElementSchema).default([])
});

export const mapBlueprintSchema = z.object({
  version: z.literal(1).default(1),
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  theme: z.string().max(80).optional(),
  grid: z.object({
    type: z.literal("square").default("square"),
    width: z.number().int().min(5).max(200),
    height: z.number().int().min(5).max(200),
    cellSize: z.number().int().min(24).max(140).optional()
  }),
  layers: z.array(mapBlueprintLayerSchema).min(1).max(20),
  lightingNotes: z.string().max(4000).optional(),
  spawnPoints: z.array(z.unknown()).default([]),
  suggestedEncounters: z.array(z.unknown()).default([]),
  dmNotes: z.string().max(4000).optional()
});

export type MapPoint = z.infer<typeof pointSchema>;
export type MapElement = z.infer<typeof mapElementSchema>;
export type MapLayerData = z.infer<typeof mapLayerDataSchema>;
export type MapBlueprint = z.infer<typeof mapBlueprintSchema>;

function hasOutOfBoundsPoint(point: MapPoint, width: number, height: number) {
  return point.x < 0 || point.y < 0 || point.x > width || point.y > height;
}

export function validateMapBlueprint(input: unknown) {
  const parsed = mapBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false as const, error: parsed.error.issues[0]?.message ?? "Invalid map blueprint." };
  }

  const warnings: string[] = [];
  const { width, height } = parsed.data.grid;
  let elementCount = 0;

  for (const layer of parsed.data.layers) {
    elementCount += layer.elements.length;
    for (const element of layer.elements) {
      if (element.bounds) {
        const maxX = element.bounds.x + element.bounds.width;
        const maxY = element.bounds.y + element.bounds.height;
        if (element.bounds.x < 0 || element.bounds.y < 0 || maxX > width || maxY > height) {
          return { valid: false as const, error: `${element.type} "${element.name ?? element.id}" is outside the map grid.` };
        }
      }
      if (element.position && hasOutOfBoundsPoint(element.position, width, height)) {
        return { valid: false as const, error: `${element.type} "${element.name ?? element.id}" has an out-of-bounds position.` };
      }
      if (element.points?.some((point) => hasOutOfBoundsPoint(point, width, height))) {
        return { valid: false as const, error: `${element.type} "${element.name ?? element.id}" has an out-of-bounds path point.` };
      }
      if (!element.bounds && !element.position && !element.points?.length) {
        warnings.push(`${element.type} "${element.name ?? element.id}" has no editable coordinates.`);
      }
    }
  }

  if (elementCount > 1000) {
    return { valid: false as const, error: "Map blueprint has too many elements for the v1 editor." };
  }

  return { valid: true as const, blueprint: parsed.data, warnings };
}

export function blueprintToMapLayers(blueprint: MapBlueprint) {
  return blueprint.layers.map((layer, index) => ({
    name: layer.name,
    order: layer.order ?? index,
    visible: layer.visible,
    locked: layer.locked,
    data: { elements: layer.elements } satisfies MapLayerData
  }));
}

export function createBlankMapBlueprint({
  name,
  width = 30,
  height = 30
}: {
  name: string;
  width?: number;
  height?: number;
}): MapBlueprint {
  return {
    version: 1,
    name,
    grid: { type: "square", width, height, cellSize: 70 },
    layers: [{ name: "Base", order: 0, visible: true, locked: false, elements: [] }],
    spawnPoints: [],
    suggestedEncounters: []
  };
}
