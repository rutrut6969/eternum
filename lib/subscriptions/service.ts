import type { SubscriptionPlanCode, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type FeatureKey = "dmTools" | "campaigns" | "advancedAi" | "publicHomebrew" | "mapGeneration" | "discord";

const activeStatuses: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

const planFeatures: Record<SubscriptionPlanCode, Record<FeatureKey, boolean>> = {
  FREE: {
    dmTools: false,
    campaigns: true,
    advancedAi: false,
    publicHomebrew: true,
    mapGeneration: false,
    discord: false
  },
  DM: {
    dmTools: true,
    campaigns: true,
    advancedAi: true,
    publicHomebrew: true,
    mapGeneration: false,
    discord: false
  },
  WORLDBUILDER: {
    dmTools: true,
    campaigns: true,
    advancedAi: true,
    publicHomebrew: true,
    mapGeneration: true,
    discord: true
  },
  FOUNDER: {
    dmTools: true,
    campaigns: true,
    advancedAi: true,
    publicHomebrew: true,
    mapGeneration: true,
    discord: true
  }
};

async function getCurrentPlanCode(userId: string): Promise<SubscriptionPlanCode> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isFounder: true }
  });
  if (user?.isFounder) return "FOUNDER";

  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: { in: activeStatuses },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    include: { plan: { select: { code: true } } },
    orderBy: { startedAt: "desc" }
  });

  return subscription?.plan.code ?? "FREE";
}

async function canUse(userId: string, feature: FeatureKey) {
  const planCode = await getCurrentPlanCode(userId);
  return planFeatures[planCode][feature];
}

export const subscriptionService = {
  getCurrentPlanCode,
  async isFounder(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isFounder: true }
    });
    return Boolean(user?.isFounder);
  },
  canAccessDmTools(userId: string) {
    return canUse(userId, "dmTools");
  },
  canCreateCampaign(userId: string) {
    return canUse(userId, "campaigns");
  },
  canUseAdvancedAI(userId: string) {
    return canUse(userId, "advancedAi");
  },
  canPublishPublicHomebrew(userId: string) {
    return canUse(userId, "publicHomebrew");
  },
  canUseFutureMapGeneration(userId: string) {
    return canUse(userId, "mapGeneration");
  },
  canUseFutureDiscordFeatures(userId: string) {
    return canUse(userId, "discord");
  }
};

export async function recordAIUsage(userId: string, date = new Date()) {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return prisma.aIUsage.upsert({
    where: { userId_month: { userId, month } },
    update: { requestCount: { increment: 1 } },
    create: { userId, month, requestCount: 1 }
  });
}
