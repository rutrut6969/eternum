import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { retrieveSquareSubscription } from "@/lib/billing/square";
import { prisma } from "@/lib/prisma";

export type SquareSubscriptionLike = {
  id?: string;
  customer_id?: string;
  status?: string;
  charged_through_date?: string;
  canceled_date?: string;
};

export function squareSubscriptionStatusToEternum(status?: string): SubscriptionStatus {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "PENDING":
      return "TRIALING";
    case "PAUSED":
      return "PAUSED";
    case "PAST_DUE":
      return "PAST_DUE";
    case "CANCELED":
      return "CANCELED";
    case "DEACTIVATED":
      return "EXPIRED";
    default:
      return "PAUSED";
  }
}

export function squareSubscriptionUpdateData(subscription: SquareSubscriptionLike): Prisma.UserSubscriptionUpdateInput {
  const status = squareSubscriptionStatusToEternum(subscription.status);
  return {
    status,
    source: "SQUARE",
    squareSubscriptionId: subscription.id,
    squareCustomerId: subscription.customer_id,
    currentPeriodEnd: subscription.charged_through_date ? new Date(subscription.charged_through_date) : undefined,
    expiresAt: status === "CANCELED" || status === "EXPIRED"
      ? subscription.canceled_date
        ? new Date(subscription.canceled_date)
        : new Date()
      : undefined
  };
}

export async function reconcileUserSubscription(userSubscriptionId: string) {
  const local = await prisma.userSubscription.findUnique({ where: { id: userSubscriptionId }, include: { plan: true } });
  if (!local?.squareSubscriptionId) return local;

  const square = await retrieveSquareSubscription(local.squareSubscriptionId);
  if (!square.subscription) return local;

  const updated = await prisma.userSubscription.update({
    where: { id: local.id },
    data: squareSubscriptionUpdateData(square.subscription),
    include: { plan: true }
  });

  await prisma.billingEvent.create({
    data: {
      userId: updated.userId,
      userSubscriptionId: updated.id,
      type: "SUBSCRIPTION_UPDATED",
      provider: "square",
      providerEventId: `${updated.squareSubscriptionId}:reconcile:${Date.now()}`,
      payload: { source: "reconcile", squareSubscription: square.subscription } as Prisma.InputJsonValue
    }
  });

  return updated;
}
