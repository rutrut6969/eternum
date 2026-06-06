import type { ActivityType, Prisma } from "@prisma/client";
import { eventBus } from "@/lib/events/event-bus";
import { prisma } from "@/lib/prisma";

export type ActivityInput = {
  campaignId: string;
  type: ActivityType;
  actorId?: string | null;
  sessionId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createActivity(input: ActivityInput) {
  const activity = await prisma.activityLog.create({
    data: {
      campaignId: input.campaignId,
      sessionId: input.sessionId,
      actorId: input.actorId,
      type: input.type,
      metadata: input.metadata ?? {}
    }
  });
  eventBus.publish("campaign.activity", activity);
  return activity;
}
