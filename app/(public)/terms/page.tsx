import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-12">
      <Badge tone="gold">Terms</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-5xl">Terms of Service</h1>
      <Card className="mt-8">
        <p className="text-sm leading-6 text-zinc-300">
          Eternum Tabletop is still in active development. This page is a launch-prep placeholder and should be finalized before public launch, subscriptions, marketplace sales, or creator payouts go live.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-300">
          <p><span className="font-semibold text-white">Content rules:</span> users may create original homebrew. Proprietary non-SRD content should not be copied, imported, published, or sold without proper licensing.</p>
          <p><span className="font-semibold text-white">AI and approval:</span> AI-generated suggestions are drafts only. The rules engine and DM approval workflow determine whether content becomes usable in a campaign.</p>
          <p><span className="font-semibold text-white">Billing:</span> Founder, DM, Worldbuilder, donations, and future marketplace purchases are processed through Square when configured. Donations do not grant premium access.</p>
          <p><span className="font-semibold text-white">Contact:</span> questions can be sent to <Link className="text-aureate hover:text-white" href="mailto:contact@obsidian-systems.tech">contact@obsidian-systems.tech</Link>.</p>
        </div>
      </Card>
    </main>
  );
}
