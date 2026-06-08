import Link from "next/link";
import { getServerSession } from "next-auth";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth/options";
import { defaultPlans } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

const plans = [
  {
    name: "Free",
    code: "FREE",
    price: "$0",
    copy: "For players exploring characters, campaigns, and public content.",
    features: ["Create characters", "Join campaigns", "Browse public content", "Limited AI usage", "Save personal content"]
  },
  {
    name: "DM",
    code: "DM",
    price: "$12/month",
    copy: "For running active campaigns and managing table workflow.",
    features: ["Campaign management", "Session tools", "Approval workflows", "Expanded AI usage", "DM dashboards"]
  },
  {
    name: "Worldbuilder",
    code: "WORLDBUILDER",
    price: "$25/month",
    copy: "For creators building larger worlds and public libraries.",
    features: ["World management", "Publishing tools", "Homebrew libraries", "Advanced AI tools", "Larger storage limits"]
  },
  {
    name: "Founder",
    code: "FOUNDER",
    price: `$${Math.round(defaultPlans.FOUNDER.monthlyPriceCents / 100)} Lifetime`,
    copy: "For early supporters who want lifetime max-tier access.",
    features: ["One-time purchase", "All current tiers", "All future platform tiers", "Founder badge", "Early feature access", "Legacy recognition"]
  }
] as const;

type PaidPlanCode = "DM" | "WORLDBUILDER" | "FOUNDER";

const matrix = [
  ["Characters", "Basic", "Expanded", "Expanded", "Lifetime expanded"],
  ["Campaigns", "Join only", "Create/manage", "Create/manage", "All future limits"],
  ["Worlds", "Personal notes", "Campaign worlds", "World libraries", "Lifetime worldbuilder"],
  ["Publishing", "Browse", "Campaign approval", "Public publishing", "Public + future marketplace"],
  ["AI Usage", "Limited", "Expanded", "Advanced", "Max tier"],
  ["Storage", "Starter", "Campaign", "Larger", "Founder priority"],
  ["Community", "Browse", "Table tools", "Creator tools", "Legacy supporter"]
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
      <Badge tone="gold">Plans and Support</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-6xl">Choose how you build in Eternum.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Start free, upgrade to run campaigns, build larger worlds, or purchase Founder lifetime access. Donations are separate and never grant premium access.
      </p>

      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.code} className={plan.code === "FOUNDER" ? "border-aureate/30 bg-aureate/5" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">{plan.name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{plan.code}</p>
              </div>
              <Badge tone={plan.code === "FREE" ? "mana" : "gold"}>{plan.price}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{plan.copy}</p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-300">
              {plan.features.map((feature) => <li key={feature} className="rounded-md bg-black/25 p-2">{feature}</li>)}
            </ul>
            {plan.code === "FREE" ? (
              <Link className="mt-5 inline-flex w-full justify-center rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana hover:bg-mana/10" href={session ? "/dashboard" : "/register"}>
                {planCode === "FREE" ? "Current free plan" : "Start free"}
              </Link>
            ) : session ? (
              <CheckoutButton planCode={plan.code as PaidPlanCode} disabled={isFounder || planCode === plan.code} label={isFounder ? "Founder access active" : planCode === plan.code ? "Current plan" : plan.code === "FOUNDER" ? "Buy lifetime access" : `Upgrade to ${plan.name}`} />
            ) : (
              <Link className="mt-5 inline-flex w-full justify-center rounded-md bg-aureate px-4 py-3 text-sm font-semibold text-void hover:bg-aureate/90" href="/register">
                Create account to purchase
              </Link>
            )}
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="mana">Compare tiers</Badge>
            <h2 className="mt-4 text-3xl font-black text-white">Feature matrix</h2>
          </div>
          <Link className="rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana" href="/donate">Donate instead</Link>
        </div>
        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-[720px] w-full border-collapse bg-black/20 text-sm">
            <thead className="bg-white/5 text-left text-white">
              <tr>{["Feature", "Free", "DM", "Worldbuilder", "Founder"].map((heading) => <th key={heading} className="border-b border-white/10 p-3">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row[0]} className="border-b border-white/10 text-zinc-300">
                  {row.map((cell, index) => <td key={cell} className={`p-3 ${index === 0 ? "font-semibold text-white" : ""}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Donations</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Anyone can donate through Square without an account. Donations support development but do not grant premium access.</p>
          <Link className="mt-5 inline-flex rounded-md bg-mana px-4 py-3 font-semibold text-void" href="/donate">Support development</Link>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">FAQ</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Can I cancel?", "Monthly plans can be canceled when billing portal support is finished; Square lifecycle handling is being expanded."],
              ["What happens if I downgrade?", "Your data remains; premium-only actions may become locked until you upgrade again."],
              ["Is Founder lifetime?", "Yes. Founder is a one-time purchase for lifetime max-tier access."],
              ["Are future updates included?", "Founder includes all future platform tiers. Monthly plans receive features included in their tier."],
              ["Can I donate instead?", "Yes. Donations are separate support payments and do not unlock premium access."]
            ].map(([question, answer]) => (
              <div key={question} className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="font-semibold text-white">{question}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{answer}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
