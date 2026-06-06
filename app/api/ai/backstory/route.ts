import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { hasDmPermission } from "@/lib/campaign-auth";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { backstorySystemPrompt } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  characterId: z.string().cuid(),
  backstory: z.string().min(100).max(8000)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Backstory must be between 100 and 8000 characters." }, { status: 400 });

  const character = await prisma.character.findUnique({
    where: { id: parsed.data.characterId },
    include: { campaign: { include: { members: true } } }
  });
  if (!character || character.ownerId !== userId) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: openAIModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: backstorySystemPrompt },
      { role: "user", content: parsed.data.backstory }
    ]
  });

  const suggestion = JSON.parse(completion.choices[0]?.message.content || "{}");
  const requesterMembership = character.campaign?.members.find((member) => member.userId === userId);
  const autoReviewNote = requesterMembership && hasDmPermission(requesterMembership.roles) ? "DM-owned character still requires explicit approval." : null;

  const analysis = await prisma.backstoryAnalysis.create({
    data: {
      characterId: character.id,
      requestedBy: userId,
      suggestion,
      dmNotes: autoReviewNote
    }
  });

  await prisma.character.update({
    where: { id: character.id },
    data: { backstory: parsed.data.backstory }
  });

  return NextResponse.json({ analysis, suggestion, status: "pending_dm_review" });
}
