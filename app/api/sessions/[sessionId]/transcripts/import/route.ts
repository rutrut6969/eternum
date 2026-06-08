import { TranscriptIntent } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const segmentSchema = z.object({
  rawText: z.string().min(1).max(10000),
  speakerUserId: z.string().cuid().optional(),
  speakerCharacterId: z.string().cuid().optional(),
  isDm: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0),
  timestamp: z.string().datetime().optional(),
  intent: z.nativeEnum(TranscriptIntent).default("UNKNOWN")
});

const importSchema = z.object({
  segments: z.array(segmentSchema).min(1).max(100)
});

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  const session = await prisma.campaignSession.findUnique({ where: { id: sessionId }, select: { campaignId: true } });
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  try {
    await requireCampaignDm(session.campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required to import transcripts." }, { status: 403 });
  }

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid transcript import." }, { status: 400 });

  const segments = await prisma.$transaction(
    parsed.data.segments.map((segment) =>
      prisma.transcriptSegment.create({
        data: {
          sessionId,
          speakerUserId: segment.speakerUserId,
          speakerCharacterId: segment.speakerCharacterId,
          isDm: segment.isDm,
          confidence: segment.confidence,
          rawText: segment.rawText,
          timestamp: segment.timestamp ? new Date(segment.timestamp) : new Date(),
          intent: segment.intent
        }
      })
    )
  );

  return NextResponse.json({ segments });
}
