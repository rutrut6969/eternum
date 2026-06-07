import Link from "next/link";
import { getServerSession } from "next-auth";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

const plans = [
  {
    name: "Free",
    code: "FREE",
    price: "$0",
    copy: "For players exploring characters, campaigns, and public content.",
    features: ["Create basic characters", "Join campaigns by invite", "Browse public library", "Limited AI-assisted drafting planned"]
  },
  {
    name: "DM",
    code: "DM",
    price: "$12/mo",
    copy: "For running active campaigns with stronger AI and approval workflows.",
    features: ["Campaign management", "Advanced AI assistance planned", "Approval queues", "Session and activity tools"]
  },
  {
    name: "Worldbuilder",
    code: "WORLDBUILDER",
    price: "$25/mo",
    copy: "For creators building maps, homebrew libraries, and larger worlds.",
    features: ["Future AI map generation", "Expanded public publishing", "World content organization", "Future Discord features"]
  },
  {
    name: "Founder",
    code: "FOUNDER",
    price: "Lifetime",
    copy: "For early supporters and long-term Eternum patrons.",
    features: ["Founder badge planned", "Worldbuilder feature access", "Early feature previews", "Legacy supporter recognition"]
  }
];

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, isFounder: true } })
    : null;
  const planCode = user ? await subscriptionService.getCurrentPlanCode(user.id) : "FREE";
  const isFounder = user?.isFounder || planCode === "FOUNDER";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
      <Badge tone="gold">Billing Foundation</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-6xl">Planned tiers</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Eternum Tabletop uses Square checkout for paid plans. Founder accounts already have lifetime max-tier access and bypass payment checks.
      </p>

      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.code}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{plan.code}</p>
              </div>
              <Badge tone={plan.code === "FREE" ? "mana" : "gold"}>{plan.price}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{plan.copy}</p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-300">
              {plan.features.map((feature) => (
                <li key={feature} className="rounded-md bg-black/25 p-2">{feature}</li>
              ))}
            </ul>
            {plan.code === "FREE" ? (
              <Link className="mt-5 inline-flex w-full justify-center rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana hover:bg-mana/10" href={session ? "/dashboard" : "/register"}>
                {planCode === "FREE" ? "Current free plan" : "Start free"}
              </Link>
            ) : plan.code === "FOUNDER" ? (
              <p className="mt-5 rounded-md border border-aureate/25 bg-aureate/10 p-3 text-sm font-semibold text-aureate">
                {isFounder ? "Founder lifetime access active" : "Founder access is granted manually"}
              </p>
            ) : (
              <CheckoutButton planCode={plan.code as "DM" | "WORLDBUILDER"} disabled={isFounder || planCode === plan.code} label={isFounder ? "Founder max access active" : planCode === plan.code ? "Current plan" : `Upgrade to ${plan.name}`} />
            )}
          </Card>
        ))}
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-white">Square checkout</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Checkout links are created server-side with Square sandbox/production credentials selected by `SQUARE_ENVIRONMENT`.</p>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">Founder bypass</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Founder accounts never enter checkout for subscriptions and pass every current premium gate.</p>
          <Link className="mt-5 inline-flex whitespace-nowrap rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana hover:bg-mana/10" href="/register">
            Create free account
          </Link>
        </Card>
      </section>
    </main>
  );
}
