import { CampaignSessionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { nextSessionTimestamps, transitionSessionStatus } from "@/lib/sessions";

const schema = z.object({
  action: z.enum(["start", "end", "archive"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string; sessionId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId, sessionId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid session action." }, { status: 400 });

  const current = await prisma.campaignSession.findFirst({ where: { id: sessionId, campaignId } });
  if (!current) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  let nextStatus: CampaignSessionStatus;
  try {
    nextStatus = transitionSessionStatus(current.status, parsed.data.action) as CampaignSessionStatus;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid session transition." }, { status: 400 });
  }

  const timestamps = nextSessionTimestamps(parsed.data.action);
  const session = await prisma.campaignSession.update({
    where: { id: current.id },
    data: {
      status: nextStatus,
      startedAt: timestamps.startedAt,
      endedAt: timestamps.endedAt
    }
  });

  await createActivity({
    campaignId,
    sessionId: session.id,
    actorId: userId,
    type: parsed.data.action === "start" ? "SESSION_STARTED" : "SESSION_ENDED",
    metadata: { title: session.title, status: session.status }
  });

  return NextResponse.json({ session });
}
