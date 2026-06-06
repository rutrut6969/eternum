import type { ActivityType, Prisma } from "@prisma/client";

export type MilestoneDraft = {
  type: ActivityType;
  title: string;
  metadata: Prisma.InputJsonValue;
};

export function milestoneForGameplayChange(field: string, value: unknown): MilestoneDraft | null {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const name = String(record.name ?? record.title ?? "Milestone");

  if (field === "learnedSpells") return { type: "SPELL_LEARNED", title: `Learned ${name}`, metadata: record as Prisma.InputJsonValue };
  if (field === "craftedItems") return { type: "ITEM_CRAFTED", title: `Crafted ${name}`, metadata: record as Prisma.InputJsonValue };
  if (field === "affinities") return { type: "AFFINITY_GAINED", title: `Gained affinity: ${name}`, metadata: record as Prisma.InputJsonValue };
  if (field === "inventory" && record.source === "awarded") return { type: "LOOT_AWARDED", title: `Received ${name}`, metadata: record as Prisma.InputJsonValue };

  return null;
}

export function professionMilestone(profession: string, level: number): MilestoneDraft {
  return {
    type: "PROFESSION_LEVEL_GAINED",
    title: `${profession} reached level ${level}`,
    metadata: { profession, level }
  };
}
