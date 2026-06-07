import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const threadSchema = z.object({
  title: z.string().min(2).max(120).default("New assistant thread"),
  campaignId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional()
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threads = await prisma.assistantThread.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      campaign: { select: { name: true } },
      character: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      workflows: { orderBy: { updatedAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" },
    take: 30
  });

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = threadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid assistant thread." }, { status: 400 });

  if (parsed.data.campaignId) {
    try {
      await requireCampaignMember(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
    }
  }

  if (parsed.data.characterId) {
    const character = await prisma.character.findFirst({
      where: { id: parsed.data.characterId, ownerId: userId },
      select: { id: true, campaignId: true }
    });
    if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });
    if (parsed.data.campaignId && character.campaignId !== parsed.data.campaignId) {
      return NextResponse.json({ error: "Character is not attached to this campaign." }, { status: 400 });
    }
  }

  const thread = await prisma.assistantThread.create({
    data: {
      userId,
      title: parsed.data.title,
      campaignId: parsed.data.campaignId,
      characterId: parsed.data.characterId,
      messages: {
        create: {
          role: "SYSTEM",
          content: "Assistant thread created. AI output remains suggestion-only until rules-engine validation and DM approval.",
          structuredPayload: { architectureRule: "AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content" } as Prisma.InputJsonValue
        }
      }
    },
    include: { messages: true, workflows: true }
  });

  return NextResponse.json({ thread }, { status: 201 });
}

