import { formatCurrency } from "@/lib/currency/conversion";

export type CraftedItemPricingInput = {
  materialCostCopper: number;
  laborValueCopper?: number;
  professionLevel?: number;
  craftingRollQuality?: number;
  rarity?: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  itemQuality?: number;
  enchantmentCount?: number;
  durabilityPercent?: number;
  demandModifier?: number;
  localEconomyModifier?: number;
  legalityModifier?: number;
  scarcityModifier?: number;
  merchantReputationModifier?: number;
  dmOverrideCopper?: number;
};

const rarityMultipliers: Record<NonNullable<CraftedItemPricingInput["rarity"]>, number> = {
  common: 1,
  uncommon: 1.75,
  rare: 3.5,
  very_rare: 7,
  legendary: 14,
  artifact: 25
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

export function priceCraftedItem(input: CraftedItemPricingInput) {
  const material = Math.max(0, Math.trunc(input.materialCostCopper));
  const labor = Math.max(0, Math.trunc(input.laborValueCopper ?? Math.max(25, material * 0.35)));
  const professionBonus = 1 + clamp(input.professionLevel ?? 0, 0, 20) * 0.025;
  const rollQuality = 1 + clamp(input.craftingRollQuality ?? 0, -10, 10) * 0.04;
  const rarity = rarityMultipliers[input.rarity ?? "common"];
  const quality = 1 + clamp(input.itemQuality ?? 0, -5, 10) * 0.05;
  const enchantments = 1 + clamp(input.enchantmentCount ?? 0, 0, 10) * 0.22;
  const durability = clamp(input.durabilityPercent ?? 100, 1, 150) / 100;
  const market =
    (1 + clamp(input.demandModifier ?? 0, -0.8, 2)) *
    (1 + clamp(input.localEconomyModifier ?? 0, -0.8, 2)) *
    (1 + clamp(input.legalityModifier ?? 0, -0.8, 2)) *
    (1 + clamp(input.scarcityModifier ?? 0, -0.8, 2)) *
    (1 + clamp(input.merchantReputationModifier ?? 0, -0.8, 2));

  const calculated = Math.max(0, Math.round((material + labor) * professionBonus * rollQuality * rarity * quality * enchantments * durability * market));
  const baseValueCopper = typeof input.dmOverrideCopper === "number" ? Math.max(0, Math.trunc(input.dmOverrideCopper)) : calculated;
  const merchantBuyCopper = Math.floor(baseValueCopper * 0.5);
  const merchantSellCopper = Math.ceil(baseValueCopper * 1.2);
  const playerShopSuggestedCopper = Math.ceil(baseValueCopper * 1.05);

  return {
    baseValueCopper,
    merchantBuyCopper,
    merchantSellCopper,
    playerShopSuggestedCopper,
    display: {
      baseValue: formatCurrency(baseValueCopper),
      merchantBuy: formatCurrency(merchantBuyCopper),
      merchantSell: formatCurrency(merchantSellCopper),
      playerShopSuggested: formatCurrency(playerShopSuggestedCopper)
    },
    breakdown: {
      material,
      labor,
      professionBonus,
      rollQuality,
      rarity,
      quality,
      enchantments,
      durability,
      market,
      dmOverrideApplied: typeof input.dmOverrideCopper === "number"
    }
  };
}
