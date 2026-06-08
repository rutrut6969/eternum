import type { MapBlueprint } from "@/lib/maps/blueprint-schema";

export type MapImportSourceType = "DUNGEON_SCRAWL";

export type MapImportSummary = {
  rooms: number;
  walls: number;
  doors: number;
  corridors: number;
  layers: number;
  labels: number;
  unsupportedObjects: number;
};

export type MapImportResult = {
  sourceType: MapImportSourceType;
  sourceFileName: string;
  importVersion?: string;
  blueprint: MapBlueprint;
  warnings: string[];
  summary: MapImportSummary;
  rawMetadata: Record<string, unknown>;
  successPercentage: number;
};

export type MapImporterInput = {
  fileName: string;
  text: string;
  fallbackName?: string;
};

export interface MapImporter {
  readonly sourceType: MapImportSourceType;
  canImport(fileName: string): boolean;
  parse(input: MapImporterInput): MapImportResult;
}
