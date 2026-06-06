export type ItemRarity = "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";

const rarityScore: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  very_rare: 4,
  legendary: 5,
  artifact: 6
};

export function normalizeRarity(rarity: string): ItemRarity {
  const normalized = rarity.toLowerCase().replace(/\s+/g, "_");
  if (normalized in rarityScore) return normalized as ItemRarity;
  return "common";
}

export function validateItemPower(input: { rarity: string; stats?: unknown; attunementRequired?: boolean }) {
  const rarity = normalizeRarity(input.rarity);
  const score = rarityScore[rarity];
  const statText = JSON.stringify(input.stats ?? {});
  const warnings: string[] = [];

  if (score <= 2 && /\+\s*[3-9]/.test(statText)) {
    warnings.push("Low-rarity items should not grant large static bonuses.");
  }
  if (score >= 4 && !input.attunementRequired) {
    warnings.push("Very rare or stronger items usually require attunement or a drawback.");
  }

  return {
    rarity,
    powerScore: score,
    balanceWarnings: warnings.length ? warnings : ["No obvious rarity issues detected. DM approval is still required."]
  };
}
