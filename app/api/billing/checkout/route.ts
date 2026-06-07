import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { ensureSubscriptionPlans, planCheckoutLabel } from "@/lib/billing/plans";
import { createSquarePaymentLink } from "@/lib/billing/square";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

const checkoutSchema = z.object({
  planId: z.string().optional(),
  planCode: z.enum(["DM", "WORLDBUILDER"]).optional(),
  marketplaceProductId: z.string().cuid().optional()
}).refine((value) => Boolean(value.planId || value.planCode || value.marketplaceProductId), "Choose a plan or product.");

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const isFounder = await subscriptionService.isFounder(userId);

  if (parsed.data.marketplaceProductId) {
    const product = await prisma.marketplaceProduct.findFirst({
      where: { id: parsed.data.marketplaceProductId, status: "ACTIVE" }
    });
    if (!product) return NextResponse.json({ error: "Marketplace product not found." }, { status: 404 });
    if (product.priceCents <= 0) return NextResponse.json({ error: "This product does not require checkout." }, { status: 400 });

    const purchase = await prisma.marketplacePurchase.create({
      data: { userId, productId: product.id, status: "PENDING", amountCents: product.priceCents, currency: product.currency }
    });
    const link = await createSquarePaymentLink({
      name: product.name,
      amountCents: product.priceCents,
      redirectUrl: `${appUrl}/dashboard/account?checkout=marketplace`,
      metadata: { kind: "marketplace", purchaseId: purchase.id, userId, productId: product.id }
    });
    await prisma.marketplacePurchase.update({
      where: { id: purchase.id },
      data: { checkoutUrl: link.payment_link.url, squareOrderId: link.payment_link.order_id }
    });
    await prisma.billingEvent.create({
      data: {
        userId,
        type: "MARKETPLACE_CHECKOUT_CREATED",
        provider: "square",
        providerEventId: link.payment_link.id,
        payload: { productId: product.id, purchaseId: purchase.id, checkoutUrl: link.payment_link.url } as Prisma.InputJsonValue
      }
    });
    return NextResponse.json({ checkoutUrl: link.payment_link.url });
  }

  if (isFounder) {
    return NextResponse.json({ error: "Founder accounts already have max-tier lifetime access." }, { status: 403 });
  }

  await ensureSubscriptionPlans();
  const plan = parsed.data.planId
    ? await prisma.subscriptionPlan.findUnique({ where: { id: parsed.data.planId } })
    : await prisma.subscriptionPlan.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || !plan.active) return NextResponse.json({ error: "Subscription plan not found." }, { status: 404 });
  if (plan.code === "FREE" || plan.code === "FOUNDER" || plan.monthlyPriceCents <= 0) {
    return NextResponse.json({ error: "This plan does not use checkout." }, { status: 400 });
  }

  const pendingSubscription = await prisma.userSubscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "PAUSED",
      source: "SQUARE",
      startedAt: new Date()
    }
  });
  const link = await createSquarePaymentLink({
    name: planCheckoutLabel(plan.code),
    amountCents: plan.monthlyPriceCents,
    redirectUrl: `${appUrl}/dashboard/account?checkout=subscription`,
    metadata: { kind: "subscription", userId, planId: plan.id, subscriptionId: pendingSubscription.id, planCode: plan.code }
  });

  await prisma.billingEvent.create({
    data: {
      userId,
      userSubscriptionId: pendingSubscription.id,
      type: "SUBSCRIPTION_CHECKOUT_CREATED",
      provider: "square",
      providerEventId: link.payment_link.id,
      payload: { planCode: plan.code, checkoutUrl: link.payment_link.url, orderId: link.payment_link.order_id } as Prisma.InputJsonValue
    }
  });

  return NextResponse.json({ checkoutUrl: link.payment_link.url });
}
