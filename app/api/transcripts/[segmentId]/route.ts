import { TranscriptIntent } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  correctedText: z.string().max(10000).optional(),
  speakerUserId: z.string().cuid().nullable().optional(),
  speakerCharacterId: z.string().cuid().nullable().optional(),
  isDm: z.boolean().optional(),
  intent: z.nativeEnum(TranscriptIntent).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ segmentId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { segmentId } = await params;
  const segment = await prisma.transcriptSegment.findUnique({ where: { id: segmentId } });
  if (!segment) return NextResponse.json({ error: "Transcript segment not found." }, { status: 404 });
  const session = await prisma.campaignSession.findUnique({ where: { id: segment.sessionId }, select: { campaignId: true } });
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  try {
    await requireCampaignDm(session.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required to correct transcripts." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid transcript update." }, { status: 400 });

  const updated = await prisma.transcriptSegment.update({
    where: { id: segmentId },
    data: parsed.data
  });

  return NextResponse.json({ segment: updated });
}
