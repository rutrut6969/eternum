import { CampaignRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { toCopper } from "@/lib/currency/conversion";
import { prisma } from "@/lib/prisma";

const scoreSchema = z.object({
  strength: z.number().int().min(3).max(20),
  dexterity: z.number().int().min(3).max(20),
  constitution: z.number().int().min(3).max(20),
  intelligence: z.number().int().min(3).max(20),
  wisdom: z.number().int().min(3).max(20),
  charisma: z.number().int().min(3).max(20)
});

const wizardSchema = z.object({
  campaignId: z.string().cuid(),
  name: z.string().min(2).max(120),
  displayTitle: z.string().max(120).optional(),
  portraitUrl: z.string().url().optional().or(z.literal("")),
  ancestry: z.string().max(80).optional(),
  speciesSlug: z.string().max(120).optional(),
  speciesSource: z.string().max(120).optional(),
  speciesTraits: z.array(z.unknown()).default([]),
  backstory: z.string().max(8000).optional(),
  castingAbility: z.enum(["CHA", "INT", "WIS"]).default("WIS"),
  scores: scoreSchema,
  trainingFocus: z.array(z.string().min(1).max(80)).max(12).default([]),
  archetypeSuggestion: z.string().max(80).optional(),
  startingCurrency: z.object({
    cp: z.number().int().min(0).max(100000).default(0),
    sp: z.number().int().min(0).max(100000).default(0),
    ep: z.number().int().min(0).max(100000).default(0),
    gp: z.number().int().min(0).max(100000).default(0),
    pp: z.number().int().min(0).max(100000).default(0)
  }).default({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 })
});

function focusToProfession(focus: string) {
  const text = focus.toLowerCase();
  if (text.includes("blacksmith")) return "Blacksmithing";
  if (text.includes("alchemy") || text.includes("herbal")) return "Alchemy";
  if (text.includes("taming") || text.includes("animal")) return "Taming";
  if (text.includes("craft") || text.includes("artific")) return "Artificing";
  if (text.includes("nature") || text.includes("forag")) return "Foraging";
  if (text.includes("mining")) return "Mining";
  return null;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = wizardSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid character wizard details." }, { status: 400 });

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: parsed.data.campaignId, userId } }
  });
  if (!membership) return NextResponse.json({ error: "Join this campaign before creating a character." }, { status: 403 });

  const startingCopper = toCopper(parsed.data.startingCurrency);
  const professions = Array.from(new Set(parsed.data.trainingFocus.map(focusToProfession).filter(Boolean))) as string[];

  const character = await prisma.$transaction(async (tx) => {
    if (!membership.roles.includes(CampaignRole.PLAYER)) {
      await tx.campaignMember.update({
        where: { id: membership.id },
        data: { roles: { set: [...membership.roles, CampaignRole.PLAYER] } }
      });
    }

    const created = await tx.character.create({
      data: {
        campaignId: parsed.data.campaignId,
        ownerId: userId,
        name: parsed.data.name,
        displayTitle: parsed.data.displayTitle || undefined,
        portraitUrl: parsed.data.portraitUrl || undefined,
        ancestry: parsed.data.ancestry,
        speciesSlug: parsed.data.speciesSlug,
        speciesSource: parsed.data.speciesSource,
        speciesTraits: parsed.data.speciesTraits as Prisma.InputJsonValue,
        className: parsed.data.archetypeSuggestion || undefined,
        trainingFocus: parsed.data.trainingFocus as Prisma.InputJsonValue,
        castingAbility: parsed.data.castingAbility,
        strength: parsed.data.scores.strength,
        dexterity: parsed.data.scores.dexterity,
        constitution: parsed.data.scores.constitution,
        intelligence: parsed.data.scores.intelligence,
        wisdom: parsed.data.scores.wisdom,
        charisma: parsed.data.scores.charisma,
        backstory: parsed.data.backstory,
        traits: parsed.data.speciesTraits as Prisma.InputJsonValue,
        affinities: parsed.data.trainingFocus.filter((focus) => /magic|nature|necromancy|arcane|holy|shadow|psionic|illusion/i.test(focus)) as Prisma.InputJsonValue,
        wallet: { create: { balanceCp: startingCopper } },
        professionLevels: { create: professions.map((profession) => ({ profession, level: 1, xp: 0 })) }
      }
    });

    if (startingCopper > 0) {
      await tx.currencyTransaction.create({
        data: {
          campaignId: parsed.data.campaignId,
          characterId: created.id,
          actorId: userId,
          type: "MANUAL_ADJUSTMENT",
          status: "APPLIED",
          amountCp: startingCopper,
          note: "Starting character wallet",
          appliedAt: new Date()
        }
      });
    }

    return created;
  });

  await createActivity({
    campaignId: parsed.data.campaignId,
    actorId: userId,
    type: "CHARACTER_CREATED",
    metadata: { characterId: character.id, name: character.name, creator: "wizard" }
  });

  return NextResponse.json({ character }, { status: 201 });
}

