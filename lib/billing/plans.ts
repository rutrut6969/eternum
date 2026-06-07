import type { SubscriptionPlanCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const defaultPlans: Record<SubscriptionPlanCode, { name: string; monthlyPriceCents: number; description: string; sortOrder: number }> = {
  FREE: { name: "Free", monthlyPriceCents: 0, description: "Player access, public browsing, and basic table tools.", sortOrder: 0 },
  DM: { name: "DM", monthlyPriceCents: 1200, description: "Campaign management, approvals, sessions, and expanded AI.", sortOrder: 10 },
  WORLDBUILDER: { name: "Worldbuilder", monthlyPriceCents: 2500, description: "Advanced worldbuilding, publishing, and future premium VTT tools.", sortOrder: 20 },
  FOUNDER: { name: "Founder", monthlyPriceCents: 0, description: "Lifetime max-tier founder access.", sortOrder: 100 }
};

export async function ensureSubscriptionPlans() {
  return Promise.all(
    Object.entries(defaultPlans).map(([code, plan]) =>
      prisma.subscriptionPlan.upsert({
        where: { code: code as SubscriptionPlanCode },
        update: {
          name: plan.name,
          description: plan.description,
          monthlyPriceCents: plan.monthlyPriceCents,
          active: true,
          sortOrder: plan.sortOrder
        },
        create: {
          code: code as SubscriptionPlanCode,
          name: plan.name,
          description: plan.description,
          monthlyPriceCents: plan.monthlyPriceCents,
          active: true,
          sortOrder: plan.sortOrder,
          features: {}
        }
      })
    )
  );
}
export function planCheckoutLabel(code: SubscriptionPlanCode) {
  if (code === "DM") return "Eternum DM monthly access";
  if (code === "WORLDBUILDER") return "Eternum Worldbuilder monthly access";
  return `Eternum ${code} access`;
}
