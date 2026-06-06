import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    price: "Planned",
    copy: "For running active campaigns with stronger AI and approval workflows.",
    features: ["Campaign management", "Advanced AI assistance planned", "Approval queues", "Session and activity tools"]
  },
  {
    name: "Worldbuilder",
    code: "WORLDBUILDER",
    price: "Planned",
    copy: "For creators building maps, homebrew libraries, and larger worlds.",
    features: ["Future AI map generation", "Expanded public publishing", "World content organization", "Future Discord features"]
  },
  {
    name: "Founder",
    code: "FOUNDER",
    price: "Planned",
    copy: "For early supporters and long-term Eternum patrons.",
    features: ["Founder badge planned", "Worldbuilder feature access", "Early feature previews", "Legacy supporter recognition"]
  }
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="gold">Billing Foundation</Badge>
      <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Planned tiers</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Eternum Tabletop is preparing a Square-powered subscription model. Payment processing, checkout, and webhooks are not implemented yet.
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
          </Card>
        ))}
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-white">Square integration planned</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">The database now stores Square customer and subscription identifiers, but checkout, billing logic, provider webhooks, and subscription management are intentionally future work.</p>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">No payment buttons yet</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">This page is informational only while the feature-gate and billing-event foundation settles.</p>
          <Link className="mt-5 inline-flex rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana hover:bg-mana/10" href="/register">
            Create free account
          </Link>
        </Card>
      </section>
    </main>
  );
}
