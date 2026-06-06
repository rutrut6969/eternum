import { Prisma } from "@prisma/client";

type BackstorySuggestion = {
  professionStartingLevels?: Array<{ profession?: string; name?: string; level?: number }>;
  traits?: string[];
  flaws?: string[];
  magicalAffinities?: string[];
  startingItems?: unknown[];
};

export function normalizeBackstorySuggestion(value: Prisma.JsonValue): BackstorySuggestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as BackstorySuggestion;
}

export function mergeStringList(existing: Prisma.JsonValue, incoming: unknown[] = []) {
  const current = Array.isArray(existing) ? existing.filter((item): item is string => typeof item === "string") : [];
  const next = incoming.filter((item): item is string => typeof item === "string");
  return Array.from(new Set([...current, ...next])) as Prisma.InputJsonValue;
}
