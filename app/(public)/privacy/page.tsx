import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5 sm:py-12">
      <Badge tone="mana">Privacy</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-5xl">Privacy Policy</h1>
      <Card className="mt-8">
        <p className="text-sm leading-6 text-zinc-300">
          Eternum Tabletop is still in active development. This page is a launch-prep placeholder and should be reviewed before public launch. The app is designed to store account, campaign, character, homebrew, session, billing, and AI workflow data needed to run tabletop campaigns.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-300">
          <p><span className="font-semibold text-white">Data use:</span> account and gameplay data is used to provide campaign management, character sheets, approvals, dice rolls, public library features, and future VTT tools.</p>
          <p><span className="font-semibold text-white">Payments:</span> Square handles payment checkout. Eternum should not store raw card numbers.</p>
          <p><span className="font-semibold text-white">AI:</span> AI features may process user-submitted prompts, campaign text, character text, and workflow drafts to generate suggestions. AI output still requires rules validation and DM approval before campaign use.</p>
          <p><span className="font-semibold text-white">Contact:</span> questions can be sent to <Link className="text-aureate hover:text-white" href="mailto:contact@obsidian-systems.tech">contact@obsidian-systems.tech</Link>.</p>
        </div>
      </Card>
    </main>
  );
}
