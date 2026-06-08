import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { verifySquareWebhookSignature } from "@/lib/billing/square";
import { prisma } from "@/lib/prisma";
import { squareSubscriptionUpdateData } from "@/lib/subscriptions/reconciliation";

function eventTypeToBillingType(type: string, paymentStatus?: string) {
  if (type.includes("subscription.created")) return "SUBSCRIPTION_CREATED" as const;
  if (type.includes("subscription.updated")) return "SUBSCRIPTION_UPDATED" as const;
  if (type.includes("subscription.canceled")) return "SUBSCRIPTION_CANCELED" as const;
  if (type.includes("payment") && paymentStatus && !["COMPLETED", "APPROVED"].includes(paymentStatus)) return "PAYMENT_FAILED" as const;
  if (type.includes("payment.created") || type.includes("payment.updated")) return "PAYMENT_SUCCEEDED" as const;
  return "WEBHOOK_RECEIVED" as const;
}

function objectData(event: Record<string, unknown>) {
  const data = event.data as { object?: Record<string, unknown> } | undefined;
  return data?.object ?? {};
}

function metadataFrom(object: Record<string, unknown>) {
  const payment = object.payment as { metadata?: Record<string, string>; order_id?: string; id?: string; status?: string; customer_id?: string } | undefined;
  const subscription = object.subscription as {
    metadata?: Record<string, string>;
    id?: string;
    status?: string;
    customer_id?: string;
    charged_through_date?: string;
    canceled_date?: string;
  } | undefined;
  return { metadata: payment?.metadata ?? subscription?.metadata ?? {}, payment, subscription };
}

async function resolveUserSubscription({
  metadata,
  payment,
  subscription
}: {
  metadata: Record<string, string>;
  payment?: { order_id?: string };
  subscription?: { id?: string };
}) {
  if (metadata.subscriptionId) {
    const byMetadata = await prisma.userSubscription.findUnique({ where: { id: metadata.subscriptionId }, include: { plan: true } });
    if (byMetadata) return byMetadata;
  }
  if (subscription?.id) {
    const bySquareSubscription = await prisma.userSubscription.findUnique({ where: { squareSubscriptionId: subscription.id }, include: { plan: true } });
    if (bySquareSubscription) return bySquareSubscription;
  }
  if (payment?.order_id) {
    const byOrder = await prisma.userSubscription.findFirst({ where: { squareCheckoutOrderId: payment.order_id }, include: { plan: true }, orderBy: { startedAt: "desc" } });
    if (byOrder) return byOrder;
  }
  return null;
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
  const resolvedSubscription = await resolveUserSubscription({ metadata, payment, subscription });

  const billingEvent = await prisma.billingEvent.create({
    data: {
      userId: metadata.userId ?? resolvedSubscription?.userId,
      userSubscriptionId: metadata.subscriptionId ?? resolvedSubscription?.id,
      type: eventTypeToBillingType(type, payment?.status),
      provider: "square",
      providerEventId: eventId,
      payload: event as Prisma.InputJsonValue
    }
  });

  if ((metadata.kind === "subscription" || resolvedSubscription?.source === "SQUARE") && resolvedSubscription && type.includes("subscription") && subscription?.id) {
    await prisma.userSubscription.update({
      where: { id: resolvedSubscription.id },
      data: squareSubscriptionUpdateData(subscription)
    }).catch(() => null);
  }

  if ((metadata.kind === "subscription" || resolvedSubscription?.source === "SQUARE") && resolvedSubscription && type.includes("payment") && payment?.customer_id) {
    await prisma.userSubscription.update({
      where: { id: resolvedSubscription.id },
      data: {
        source: "SQUARE",
        squareCustomerId: payment.customer_id,
        squareCheckoutOrderId: payment.order_id
      }
    }).catch(() => null);
  }

  if (metadata.kind === "founder_lifetime" && metadata.subscriptionId && (type.includes("payment.created") || type.includes("payment.updated"))) {
    const paid = !payment?.status || ["COMPLETED", "APPROVED"].includes(payment.status);
    if (paid) {
      await prisma.userSubscription.update({
        where: { id: metadata.subscriptionId },
        data: {
          status: "ACTIVE",
          source: "FOUNDER",
          squareCustomerId: payment?.customer_id,
          squareCheckoutOrderId: payment?.order_id,
          expiresAt: null
        }
      }).catch(() => null);
      if (metadata.userId) {
        await prisma.user.update({
          where: { id: metadata.userId },
          data: { isFounder: true, founderSince: new Date(), emailVerified: new Date() }
        }).catch(() => null);
      }
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
