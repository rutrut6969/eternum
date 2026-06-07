import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const workflowUpdateSchema = z.object({
  status: z.enum(["DRAFTING", "WAITING_FOR_USER", "READY_TO_SAVE", "SUBMITTED_FOR_REVIEW", "COMPLETED", "ARCHIVED"]).optional(),
  currentStep: z.string().min(1).max(80).optional(),
  targetType: z.string().max(80).nullable().optional(),
  targetId: z.string().max(120).nullable().optional(),
  draftPayload: z.record(z.unknown()).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workflowId } = await params;

  const existing = await prisma.assistantWorkflow.findFirst({
    where: { id: workflowId, thread: { userId } },
    select: { id: true }
  });
  if (!existing) return NextResponse.json({ error: "Assistant workflow not found." }, { status: 404 });

  const parsed = workflowUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid workflow update." }, { status: 400 });

  const workflow = await prisma.assistantWorkflow.update({
    where: { id: workflowId },
    data: {
      status: parsed.data.status,
      currentStep: parsed.data.currentStep,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      draftPayload: parsed.data.draftPayload as Prisma.InputJsonValue | undefined
    }
  });

  return NextResponse.json({ workflow });
}

