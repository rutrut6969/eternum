import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSquarePaymentLink } from "@/lib/billing/square";
import { prisma } from "@/lib/prisma";

const donationSchema = z.object({
  amountCents: z.number().int().min(100).max(50000)
});

export async function POST(request: Request) {
  const parsed = donationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a donation amount between $1 and $500." }, { status: 400 });

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = await createSquarePaymentLink({
    name: "Eternum development donation",
    amountCents: parsed.data.amountCents,
    redirectUrl: `${appUrl}/donate?thanks=1`,
    metadata: { kind: "donation", amountCents: String(parsed.data.amountCents) }
  });

  await prisma.billingEvent.create({
    data: {
      type: "CHECKOUT_CREATED",
      provider: "square",
      providerEventId: link.payment_link.id,
      payload: { kind: "donation", amountCents: parsed.data.amountCents, checkoutUrl: link.payment_link.url } as Prisma.InputJsonValue
    }
  });

  return NextResponse.json({ checkoutUrl: link.payment_link.url });
}
