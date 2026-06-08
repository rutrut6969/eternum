import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { verifySquareWebhookSignature } from "@/lib/billing/square";
import { prisma } from "@/lib/prisma";

function eventTypeToBillingType(type: string) {
  if (type.includes("subscription.created")) return "SUBSCRIPTION_CREATED" as const;
  if (type.includes("subscription.updated")) return "SUBSCRIPTION_UPDATED" as const;
  if (type.includes("subscription.canceled")) return "SUBSCRIPTION_CANCELED" as const;
  if (type.includes("payment.created") || type.includes("payment.updated")) return "PAYMENT_SUCCEEDED" as const;
  return "WEBHOOK_RECEIVED" as const;
}

function objectData(event: Record<string, unknown>) {
  const data = event.data as { object?: Record<string, unknown> } | undefined;
  return data?.object ?? {};
}

function metadataFrom(object: Record<string, unknown>) {
  const payment = object.payment as { metadata?: Record<string, string>; order_id?: string; id?: string; status?: string } | undefined;
  const subscription = object.subscription as { metadata?: Record<string, string>; id?: string; status?: string; charged_through_date?: string } | undefined;
  return { metadata: payment?.metadata ?? subscription?.metadata ?? {}, payment, subscription };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || `${process.env.NEXTAUTH_URL}/api/billing/square/webhook`;

  if (!verifySquareWebhookSignature({ notificationUrl, rawBody, signature })) {
    return NextResponse.json({ error: "Invalid Square webhook signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const eventId = String(event.event_id || event.merchant_id || randomUUID());
  const type = String(event.type || "unknown");
  const object = objectData(event);
  const { metadata, payment, subscription } = metadataFrom(object);

  const billingEvent = await prisma.billingEvent.create({
    data: {
      userId: metadata.userId,
      userSubscriptionId: metadata.subscriptionId,
      type: eventTypeToBillingType(type),
      provider: "square",
      providerEventId: eventId,
      payload: event as Prisma.InputJsonValue
    }
  });

  if (metadata.kind === "subscription" && metadata.subscriptionId && (type.includes("payment") || type.includes("subscription"))) {
    const update: Prisma.UserSubscriptionUpdateInput = {
      status: subscription?.status === "CANCELED" ? "CANCELED" : "ACTIVE",
      source: "SQUARE",
      squareSubscriptionId: subscription?.id,
      currentPeriodEnd: subscription?.charged_through_date ? new Date(subscription.charged_through_date) : undefined
    };
    await prisma.userSubscription.update({
      where: { id: metadata.subscriptionId },
      data: update
    }).catch(() => null);
    if (metadata.planCode === "FOUNDER" && metadata.userId && update.status === "ACTIVE") {
      await prisma.user.update({
        where: { id: metadata.userId },
        data: { isFounder: true, founderSince: new Date(), emailVerified: new Date() }
      }).catch(() => null);
    }
  }

  if (metadata.kind === "marketplace" && metadata.purchaseId && (type.includes("payment.created") || type.includes("payment.updated"))) {
    const paid = !payment?.status || ["COMPLETED", "APPROVED"].includes(payment.status);
    if (paid) {
      const purchase = await prisma.marketplacePurchase.update({
        where: { id: metadata.purchaseId },
        data: { status: "PAID", squarePaymentId: payment?.id, squareOrderId: payment?.order_id },
        include: { product: true }
      }).catch(() => null);
      if (purchase) {
        await prisma.userEntitlement.upsert({
          where: { userId_productId: { userId: purchase.userId, productId: purchase.productId } },
          update: { active: true, source: "purchase" },
          create: { userId: purchase.userId, productId: purchase.productId, source: "purchase" }
        });
        await prisma.billingEvent.create({
          data: {
            userId: purchase.userId,
            type: "ENTITLEMENT_GRANTED",
            provider: "internal",
            providerEventId: `${billingEvent.id}:entitlement`,
            payload: { purchaseId: purchase.id, productId: purchase.productId } as Prisma.InputJsonValue
          }
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
