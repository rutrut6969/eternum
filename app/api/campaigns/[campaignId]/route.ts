import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  settings: z.record(z.unknown()).optional(),
  archive: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign update." }, { status: 400 });

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      settings: parsed.data.settings as Prisma.InputJsonValue | undefined,
      archivedAt: parsed.data.archive ? new Date() : undefined
    }
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { archivedAt: new Date() }
  });

  return NextResponse.json({ campaign });
}
