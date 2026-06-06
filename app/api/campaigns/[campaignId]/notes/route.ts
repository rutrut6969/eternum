import { NoteVisibility } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActivity } from "@/lib/activity";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission, requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().min(1).max(20000),
  sessionId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional(),
  visibility: z.enum(["DM_ONLY", "CAMPAIGN_SHARED", "CHARACTER_PRIVATE"])
});

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  let membership;
  try {
    membership = await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const isDm = hasDmPermission(membership.roles);
  const notes = await prisma.campaignNote.findMany({
    where: {
      campaignId,
      OR: [
        { visibility: "CAMPAIGN_SHARED" },
        ...(isDm ? [{ visibility: "DM_ONLY" as NoteVisibility }] : []),
        { visibility: "CHARACTER_PRIVATE", character: { ownerId: userId } },
        { authorId: userId }
      ]
    },
    include: { author: { select: { name: true, username: true } }, character: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ notes });
}

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  let membership;
  try {
    membership = await requireCampaignMember(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  if (parsed.data.visibility === "DM_ONLY" && !hasDmPermission(membership.roles)) {
    return NextResponse.json({ error: "Only DMs can create private DM notes." }, { status: 403 });
  }

  const note = await prisma.campaignNote.create({
    data: {
      campaignId,
      sessionId: parsed.data.sessionId,
      authorId: userId,
      characterId: parsed.data.characterId,
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility
    }
  });

  await createActivity({
    campaignId,
    sessionId: note.sessionId,
    actorId: userId,
    type: "NOTE_CREATED",
    metadata: { title: note.title, visibility: note.visibility, characterId: note.characterId }
  });

  return NextResponse.json({ note }, { status: 201 });
}
