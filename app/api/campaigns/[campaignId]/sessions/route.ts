import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional()
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

  const sessions = await prisma.campaignSession.findMany({
    where: { campaignId, status: { not: "ARCHIVED" } },
    orderBy: [{ sessionNumber: "desc" }]
  });
  return NextResponse.json({ sessions });
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

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid session details." }, { status: 400 });

  const last = await prisma.campaignSession.findFirst({ where: { campaignId }, orderBy: { sessionNumber: "desc" } });
  const session = await prisma.campaignSession.create({
    data: {
      campaignId,
      title: parsed.data.title,
      description: parsed.data.description,
      sessionNumber: (last?.sessionNumber ?? 0) + 1,
      createdById: userId
    }
  });

  await createActivity({
    campaignId,
    sessionId: session.id,
    actorId: userId,
    type: "SESSION_CREATED",
    metadata: { title: session.title, sessionNumber: session.sessionNumber }
  });

  return NextResponse.json({ session }, { status: 201 });
}
