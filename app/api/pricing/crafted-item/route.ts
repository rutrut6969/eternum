import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { priceCraftedItem } from "@/lib/rules/pricing";

const pricingSchema = z.object({
  materialCostCopper: z.number().int().min(0),
  laborValueCopper: z.number().int().min(0).optional(),
  professionLevel: z.number().int().min(0).max(20).optional(),
  craftingRollQuality: z.number().min(-10).max(10).optional(),
  rarity: z.enum(["common", "uncommon", "rare", "very_rare", "legendary", "artifact"]).optional(),
  itemQuality: z.number().min(-5).max(10).optional(),
  enchantmentCount: z.number().int().min(0).max(10).optional(),
  durabilityPercent: z.number().min(1).max(150).optional(),
  demandModifier: z.number().min(-0.8).max(2).optional(),
  localEconomyModifier: z.number().min(-0.8).max(2).optional(),
  legalityModifier: z.number().min(-0.8).max(2).optional(),
  scarcityModifier: z.number().min(-0.8).max(2).optional(),
  merchantReputationModifier: z.number().min(-0.8).max(2).optional(),
  dmOverrideCopper: z.number().int().min(0).optional()
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = pricingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid crafted item pricing request." }, { status: 400 });

  return NextResponse.json({
    pricing: priceCraftedItem(parsed.data),
    note: "AI may explain pricing, but Eternum rules services calculate copper values."
  });
}
