import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { assistantSystemPrompt, classifyAssistantIntent } from "@/lib/assistant/intents";
import { authOptions } from "@/lib/auth/options";
import { requireCampaignMember } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { recordAIUsage, subscriptionService } from "@/lib/subscriptions/service";

const messageSchema = z.object({
  threadId: z.string().cuid().optional(),
  message: z.string().min(2).max(4000),
  campaignId: z.string().cuid().optional(),
  characterId: z.string().cuid().optional()
});

function parseAssistantJson(content: string) {
  try {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return JSON.parse(fenced?.[1] ?? trimmed);
  } catch {
    return {
      summary: content,
      questions: [],
      suggestedNextActions: [],
      structuredDraft: {},
      rulesEngineNotes: ["Assistant returned prose instead of JSON; treat this as advisory only."],
      dmApprovalRequired: true
    };
  }
}

function titleFromMessage(message: string) {
  const words = message.trim().replace(/\s+/g, " ").slice(0, 72);
  return words.length >= 2 ? words : "Assistant thread";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid assistant message." }, { status: 400 });

  if (!(await subscriptionService.canUseAdvancedAI(userId))) {
    return NextResponse.json({ error: "The unified AI assistant requires a DM, Worldbuilder, or Founder plan." }, { status: 403 });
  }

  if (!parsed.data.threadId && parsed.data.campaignId) {
    try {
      await requireCampaignMember(parsed.data.campaignId, userId);
    } catch {
      return NextResponse.json({ error: "Campaign membership required." }, { status: 403 });
    }
  }

  if (!parsed.data.threadId && parsed.data.characterId) {
    const character = await prisma.character.findFirst({
      where: { id: parsed.data.characterId, ownerId: userId },
      select: { id: true, campaignId: true }
    });
    if (!character) return NextResponse.json({ error: "Character not found." }, { status: 404 });
    if (parsed.data.campaignId && character.campaignId !== parsed.data.campaignId) {
      return NextResponse.json({ error: "Character is not attached to this campaign." }, { status: 400 });
    }
  }

  const intent = classifyAssistantIntent(parsed.data.message);
  const thread = parsed.data.threadId
    ? await prisma.assistantThread.findFirst({ where: { id: parsed.data.threadId, userId, status: "ACTIVE" }, include: { messages: { orderBy: { createdAt: "asc" }, take: 10 } } })
    : await prisma.assistantThread.create({
        data: {
          userId,
          title: titleFromMessage(parsed.data.message),
          campaignId: parsed.data.campaignId,
          characterId: parsed.data.characterId
        },
        include: { messages: true }
      });

  if (!thread) return NextResponse.json({ error: "Assistant thread not found." }, { status: 404 });

  await recordAIUsage(userId);

  const userMessage = await prisma.assistantMessage.create({
    data: {
      threadId: thread.id,
      userId,
      role: "USER",
      content: parsed.data.message,
      structuredPayload: { intent: intent.type } as Prisma.InputJsonValue
    }
  });

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: openAIModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: assistantSystemPrompt(intent) },
        ...thread.messages
          .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
          .slice(-8)
          .map((message) => ({
            role: message.role === "USER" ? "user" as const : "assistant" as const,
            content: message.content
          })),
        { role: "user", content: parsed.data.message }
      ]
    });

    const content = completion.choices[0]?.message.content || "{}";
    const payload = parseAssistantJson(content);
    const assistantContent = String(payload.summary || "I drafted a structured suggestion. Review it before saving anything to a campaign.");

    const assistantMessage = await prisma.assistantMessage.create({
      data: {
        threadId: thread.id,
        role: "ASSISTANT",
        content: assistantContent,
        structuredPayload: payload as Prisma.InputJsonValue
      }
    });

    const workflow = await prisma.assistantWorkflow.create({
      data: {
        threadId: thread.id,
        type: intent.type,
        status: intent.type === "RULE_EXPLANATION" || intent.type === "GENERAL" ? "COMPLETED" : "DRAFTING",
        currentStep: intent.currentStep,
        targetType: intent.targetType,
        draftPayload: payload as Prisma.InputJsonValue
      }
    });

    await prisma.assistantThread.update({
      where: { id: thread.id },
      data: { title: thread.title || titleFromMessage(parsed.data.message) }
    });

    return NextResponse.json({ threadId: thread.id, intent, userMessage, assistantMessage, workflow, payload });
  } catch (error) {
    console.error("Unified assistant message failed", error);
    const assistantMessage = await prisma.assistantMessage.create({
      data: {
        threadId: thread.id,
        role: "ASSISTANT",
        content: "The assistant is temporarily unavailable. Your message was saved, and you can try again shortly.",
        structuredPayload: { error: "assistant_unavailable", intent: intent.type } as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ threadId: thread.id, intent, userMessage, assistantMessage, error: "Assistant temporarily unavailable." }, { status: 503 });
  }
}
