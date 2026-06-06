import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const mapSchema = z.object({
  name: z.string().min(2).max(160),
  sessionId: z.string().cuid().optional(),
  width: z.number().int().min(5).max(200).default(30),
  height: z.number().int().min(5).max(200).default(30)
});

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const maps = await prisma.map.findMany({
    where: { campaignId },
    include: { layers: true, tokens: true, encounters: { include: { initiative: true } } },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ maps });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = mapSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid map details." }, { status: 400 });

  const map = await prisma.map.create({
    data: {
      campaignId,
      sessionId: parsed.data.sessionId,
      name: parsed.data.name,
      width: parsed.data.width,
      height: parsed.data.height,
      createdById: userId,
      layers: { create: [{ name: "Base", order: 0 }] }
    },
    include: { layers: true, tokens: true }
  });

  return NextResponse.json({ map }, { status: 201 });
}
