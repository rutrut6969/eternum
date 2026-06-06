export const tierManaCost = {
  1: 5,
  2: 10,
  3: 20,
  4: 35,
  5: 55,
  6: 80
} as const;

export type SpellTier = keyof typeof tierManaCost;
export type InfusionTarget = "damage" | "range" | "area" | "healing" | "duration" | "effect";

export type SpellInfusion = {
  target: InfusionTarget;
  mana: number;
  tradeoff?: string;
};

export function deriveTierFromMana(manaCost: number): SpellTier {
  if (manaCost <= 5) return 1;
  if (manaCost <= 10) return 2;
  if (manaCost <= 20) return 3;
  if (manaCost <= 35) return 4;
  if (manaCost <= 55) return 5;
  return 6;
}

export function calculateInfusedSpell(baseTier: SpellTier, infusions: SpellInfusion[]) {
  const infusionMana = infusions.reduce((sum, infusion) => sum + Math.max(0, infusion.mana), 0);
  const totalMana = tierManaCost[baseTier] + infusionMana;
  const missingTradeoffs = infusions.filter((infusion) => infusion.mana >= 10 && !infusion.tradeoff);

  return {
    baseMana: tierManaCost[baseTier],
    infusionMana,
    totalMana,
    finalTier: deriveTierFromMana(totalMana),
    balanceNotes:
      missingTradeoffs.length > 0
        ? ["Infusions of 10+ mana require an explicit cost, limitation, or tactical tradeoff."]
        : ["Mana cost and tier derived by Eternum rules engine. DM approval is still required."]
  };
}
