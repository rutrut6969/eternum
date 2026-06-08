import type { MapElement, MapPoint } from "@/lib/maps/blueprint-schema";
import type { MapImporter, MapImporterInput, MapImportResult, MapImportSummary } from "@/lib/maps/importers/types";

type UnknownRecord = Record<string, unknown>;

const maxImportObjects = 5000;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function stringFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function clampGrid(value: number | undefined, fallback: number) {
  return Math.max(5, Math.min(200, Math.round(value ?? fallback)));
}

function normalizeCoordinate(value: number | undefined, divisor: number) {
  if (value === undefined) return undefined;
  if (Math.abs(value) > 240) return Number((value / divisor).toFixed(2));
  return Number(value.toFixed(2));
}

function inferCellSize(root: UnknownRecord) {
  const grid = isRecord(root.grid) ? root.grid : isRecord(root.settings) ? root.settings : root;
  return Math.max(24, Math.min(140, numberFrom(grid, ["cellSize", "gridSize", "squareSize", "pixelsPerCell"]) ?? 70));
}

function inferDimensions(root: UnknownRecord, cellSize: number) {
  const grid = isRecord(root.grid) ? root.grid : root;
  const width = numberFrom(grid, ["width", "gridWidth", "columns", "cols"]);
  const height = numberFrom(grid, ["height", "gridHeight", "rows"]);
  const pixelWidth = numberFrom(root, ["width", "pixelWidth", "canvasWidth"]);
  const pixelHeight = numberFrom(root, ["height", "pixelHeight", "canvasHeight"]);
  return {
    width: clampGrid(width ?? (pixelWidth ? pixelWidth / cellSize : undefined), 30),
    height: clampGrid(height ?? (pixelHeight ? pixelHeight / cellSize : undefined), 30)
  };
}

function idFor(prefix: string, index: number) {
  return `ds-${prefix}-${index}`;
}

function objectKind(record: UnknownRecord) {
  return `${stringFrom(record, ["type", "kind", "objectType", "shape", "tool", "name"]) ?? ""}`.toLowerCase();
}

function boundsFrom(record: UnknownRecord, cellSize: number, widthLimit: number, heightLimit: number) {
  const bounds = isRecord(record.bounds) ? record.bounds : isRecord(record.rect) ? record.rect : record;
  const x = normalizeCoordinate(numberFrom(bounds, ["x", "left"]), cellSize);
  const y = normalizeCoordinate(numberFrom(bounds, ["y", "top"]), cellSize);
  const width = normalizeCoordinate(numberFrom(bounds, ["width", "w"]), cellSize);
  const height = normalizeCoordinate(numberFrom(bounds, ["height", "h"]), cellSize);
  if (x === undefined || y === undefined || width === undefined || height === undefined || width <= 0 || height <= 0) return undefined;
  return {
    x: Math.max(0, Math.min(widthLimit - 1, x)),
    y: Math.max(0, Math.min(heightLimit - 1, y)),
    width: Math.max(0.25, Math.min(widthLimit - x, width)),
    height: Math.max(0.25, Math.min(heightLimit - y, height))
  };
}

function pointFrom(value: unknown, cellSize: number): MapPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = normalizeCoordinate(asNumber(value[0]), cellSize);
    const y = normalizeCoordinate(asNumber(value[1]), cellSize);
    return x === undefined || y === undefined ? null : { x, y };
  }
  if (isRecord(value)) {
    const x = normalizeCoordinate(numberFrom(value, ["x", "left"]), cellSize);
    const y = normalizeCoordinate(numberFrom(value, ["y", "top"]), cellSize);
    return x === undefined || y === undefined ? null : { x, y };
  }
  return null;
}

function pointsFrom(record: UnknownRecord, cellSize: number) {
  const source = Array.isArray(record.points)
    ? record.points
    : Array.isArray(record.path)
      ? record.path
      : Array.isArray(record.vertices)
        ? record.vertices
        : undefined;
  if (source) return source.map((point) => pointFrom(point, cellSize)).filter(Boolean) as MapPoint[];
  const x1 = normalizeCoordinate(numberFrom(record, ["x1", "startX"]), cellSize);
  const y1 = normalizeCoordinate(numberFrom(record, ["y1", "startY"]), cellSize);
  const x2 = normalizeCoordinate(numberFrom(record, ["x2", "endX"]), cellSize);
  const y2 = normalizeCoordinate(numberFrom(record, ["y2", "endY"]), cellSize);
  if ([x1, y1, x2, y2].every((value) => value !== undefined)) return [{ x: x1!, y: y1! }, { x: x2!, y: y2! }];
  return [];
}

function positionFrom(record: UnknownRecord, cellSize: number) {
  return pointFrom(record.position ?? record, cellSize) ?? undefined;
}

function layerObjects(root: UnknownRecord) {
  const candidates = [root.layers, root.levels, root.floors].filter(Array.isArray) as unknown[][];
  if (candidates[0]) return candidates[0].filter(isRecord);
  return [{ name: "Imported", objects: Array.isArray(root.objects) ? root.objects : Array.isArray(root.elements) ? root.elements : [] }];
}

function objectsFromLayer(layer: UnknownRecord) {
  for (const key of ["objects", "elements", "items", "shapes", "children"]) {
    if (Array.isArray(layer[key])) return layer[key].filter(isRecord);
  }
  return [];
}

function collectRecords(value: unknown, into: UnknownRecord[], depth = 0) {
  if (into.length >= maxImportObjects || depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, into, depth + 1);
    return;
  }
  if (!isRecord(value)) return;
  if (objectKind(value) || value.bounds || value.points || value.path || value.rect) into.push(value);
  for (const [key, child] of Object.entries(value)) {
    if (["raw", "image", "texture", "style"].includes(key.toLowerCase())) continue;
    if (Array.isArray(child) || isRecord(child)) collectRecords(child, into, depth + 1);
  }
}

function convertRecord(record: UnknownRecord, index: number, cellSize: number, gridWidth: number, gridHeight: number): { element?: MapElement; unsupported?: string } {
  const kind = objectKind(record);
  const name = stringFrom(record, ["name", "title", "label"]);
  const base = {
    visibility: "DM_ONLY" as const,
    ...(name ? { name } : {}),
    metadata: { importedFrom: "dungeon_scrawl", ...(kind ? { originalType: kind } : {}) }
  };

  if (kind.includes("room") || kind.includes("rect") || kind.includes("chamber")) {
    const bounds = boundsFrom(record, cellSize, gridWidth, gridHeight);
    if (!bounds) return { unsupported: name || kind || "room without bounds" };
    return { element: { id: idFor("room", index), type: "room", bounds, ...base } };
  }
  if (kind.includes("corridor") || kind.includes("hall") || kind.includes("path")) {
    const points = pointsFrom(record, cellSize);
    const bounds = boundsFrom(record, cellSize, gridWidth, gridHeight);
    if (points.length >= 2) return { element: { id: idFor("corridor", index), type: "corridor", points, ...base } };
    if (bounds) return { element: { id: idFor("corridor", index), type: "corridor", bounds, ...base } };
    return { unsupported: name || kind || "corridor without coordinates" };
  }
  if (kind.includes("wall") || kind.includes("line")) {
    const points = pointsFrom(record, cellSize);
    if (points.length >= 2) return { element: { id: idFor("wall", index), type: "wall", points: points.slice(0, 2), blocksMovement: true, blocksVision: true, ...base } };
    return { unsupported: name || kind || "wall without endpoints" };
  }
  if (kind.includes("door")) {
    const position = positionFrom(record, cellSize);
    const points = pointsFrom(record, cellSize);
    if (position) return { element: { id: idFor("door", index), type: "door", position, rotation: numberFrom(record, ["rotation", "angle"]) ?? 0, open: false, ...base } };
    if (points.length) return { element: { id: idFor("door", index), type: "door", position: points[0], rotation: numberFrom(record, ["rotation", "angle"]) ?? 0, open: false, ...base } };
    return { unsupported: name || kind || "door without position" };
  }
  if (kind.includes("label") || kind.includes("text") || typeof record.text === "string") {
    const position = positionFrom(record, cellSize);
    if (!position) return { unsupported: name || kind || "label without position" };
    return { element: { id: idFor("label", index), type: "label", position, label: String(record.text ?? name ?? "Imported label").slice(0, 120), ...base } };
  }
  if (kind.includes("stair")) {
    const bounds = boundsFrom(record, cellSize, gridWidth, gridHeight);
    const position = positionFrom(record, cellSize);
    if (bounds) return { element: { id: idFor("stairs", index), type: "stairs", bounds, ...base } };
    if (position) return { element: { id: idFor("stairs", index), type: "stairs", position, ...base } };
  }
  if (kind.includes("terrain") || kind.includes("water") || kind.includes("pit") || kind.includes("lava")) {
    const bounds = boundsFrom(record, cellSize, gridWidth, gridHeight);
    if (bounds) return { element: { id: idFor("terrain", index), type: "terrain", bounds, terrainType: kind || "imported", ...base } };
  }
  return { unsupported: name || kind || "unsupported object" };
}

function emptySummary(): MapImportSummary {
  return { rooms: 0, walls: 0, doors: 0, corridors: 0, layers: 0, labels: 0, unsupportedObjects: 0 };
}

function incrementSummary(summary: MapImportSummary, element: MapElement) {
  if (element.type === "room") summary.rooms += 1;
  if (element.type === "wall") summary.walls += 1;
  if (element.type === "door") summary.doors += 1;
  if (element.type === "corridor") summary.corridors += 1;
  if (element.type === "label") summary.labels += 1;
}

export class DungeonScrawlImporter implements MapImporter {
  readonly sourceType = "DUNGEON_SCRAWL" as const;

  canImport(fileName: string) {
    return fileName.toLowerCase().endsWith(".ds");
  }

  parse(input: MapImporterInput): MapImportResult {
    if (!this.canImport(input.fileName)) throw new Error("Only Dungeon Scrawl .ds files are supported by this importer.");
    let root: unknown;
    try {
      root = JSON.parse(input.text);
    } catch {
      throw new Error("Could not parse Dungeon Scrawl project JSON. The file may be corrupted or unsupported.");
    }
    if (!isRecord(root)) throw new Error("Dungeon Scrawl project structure was not recognized.");

    const cellSize = inferCellSize(root);
    const dimensions = inferDimensions(root, cellSize);
    const sourceLayers = layerObjects(root);
    const warnings: string[] = [];
    const summary = emptySummary();
    const convertedLayers = sourceLayers.map((layer, layerIndex) => {
      const directObjects = objectsFromLayer(layer);
      const records: UnknownRecord[] = directObjects.length ? directObjects : [];
      if (!directObjects.length) collectRecords(layer, records);
      const elements: MapElement[] = [];
      records.slice(0, maxImportObjects).forEach((record, objectIndex) => {
        const converted = convertRecord(record, layerIndex * 10000 + objectIndex + 1, cellSize, dimensions.width, dimensions.height);
        if (converted.element) {
          elements.push(converted.element);
          incrementSummary(summary, converted.element);
        } else if (converted.unsupported) {
          summary.unsupportedObjects += 1;
          if (warnings.length < 25) warnings.push(`Unsupported Dungeon Scrawl object: ${converted.unsupported}`);
        }
      });
      return {
        name: stringFrom(layer, ["name", "title", "label"]) ?? `Imported Layer ${layerIndex + 1}`,
        order: numberFrom(layer, ["order", "index", "zIndex"]) ?? layerIndex,
        visible: layer.visible !== false && layer.hidden !== true,
        locked: layer.locked === true,
        elements
      };
    }).filter((layer) => layer.elements.length || sourceLayers.length === 1);

    summary.layers = convertedLayers.length;
    if (!convertedLayers.length) {
      convertedLayers.push({ name: "Imported Raw Data", order: 0, visible: true, locked: false, elements: [] });
      warnings.push("No editable Dungeon Scrawl geometry could be converted; raw project metadata was preserved.");
    }

    const total = summary.rooms + summary.walls + summary.doors + summary.corridors + summary.labels + summary.unsupportedObjects;
    const successPercentage = total ? Math.round(((total - summary.unsupportedObjects) / total) * 100) : 0;

    return {
      sourceType: this.sourceType,
      sourceFileName: input.fileName,
      importVersion: stringFrom(root, ["version", "appVersion", "dungeonScrawlVersion"]),
      blueprint: {
        version: 1,
        name: input.fallbackName || stringFrom(root, ["name", "title"]) || input.fileName.replace(/\.ds$/i, ""),
        description: "Imported from a Dungeon Scrawl project file.",
        theme: stringFrom(root, ["theme", "style"]),
        grid: { type: "square", width: dimensions.width, height: dimensions.height, cellSize },
        layers: convertedLayers,
        lightingNotes: undefined,
        spawnPoints: [],
        suggestedEncounters: [],
        dmNotes: warnings.length ? "Some Dungeon Scrawl features could not be converted. Review import warnings." : undefined
      },
      warnings,
      summary,
      rawMetadata: {
        sourceKeys: Object.keys(root).slice(0, 50),
        preservedRawProject: root
      },
      successPercentage
    };
  }
}

export const dungeonScrawlImporter = new DungeonScrawlImporter();
