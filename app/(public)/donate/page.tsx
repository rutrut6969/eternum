import Link from "next/link";
import { DonationForm } from "@/components/billing/donation-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function DonatePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Badge tone="mana">Support Development</Badge>
      <h1 className="mt-5 text-4xl font-black text-white sm:text-6xl">Help support Eternum development.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Donations help cover hosting, AI development, VTT tooling, art direction, testing, and the long road toward a full campaign ecosystem.
      </p>
      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">One-time donation</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">No account is required. Donations do not unlock premium access, subscriptions, marketplace items, or Founder status.</p>
          <div className="mt-6">
            <DonationForm />
          </div>
        </Card>
        <div className="grid gap-4">
          <Card>
            <h2 className="text-2xl font-bold text-white">Want lifetime access?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Founder is a separate one-time purchase that grants lifetime access, a badge, early feature access, and all future platform tiers.</p>
            <Link className="mt-5 inline-flex rounded-md bg-aureate px-4 py-3 font-semibold text-void" href="/pricing">View Founder tier</Link>
          </Card>
          <Card>
            <h2 className="text-2xl font-bold text-white">What support funds</h2>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300">
              {["Public library polish", "Campaign player/VTT tools", "AI workflow reliability", "Map builder upgrades", "Marketplace and creator tools"].map((item) => (
                <p key={item} className="rounded-md bg-black/25 p-3">{item}</p>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
