import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const lootEventSchema = z.object({
  campaignId: z.string().cuid(),
  sessionId: z.string().cuid().optional(),
  description: z.string().min(1).max(5000),
  currencyCopper: z.number().int().min(0).default(0),
  items: z.array(z.record(z.unknown())).default([])
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = lootEventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid loot event." }, { status: 400 });

  try {
    await requireCampaignDm(parsed.data.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required to record loot events." }, { status: 403 });
  }

  const event = await prisma.lootEvent.create({
    data: {
      campaignId: parsed.data.campaignId,
      sessionId: parsed.data.sessionId,
      createdById: userId,
      description: parsed.data.description,
      currencyCopper: parsed.data.currencyCopper,
      items: parsed.data.items as Prisma.InputJsonValue,
      source: "manual"
    }
  });

  return NextResponse.json({ event }, { status: 201 });
}
