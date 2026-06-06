import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const queues = [
  ["Character approvals", "Backstory analysis and starting profession suggestions"],
  ["Homebrew approvals", "Custom spells, items, recipes, NPCs, and discipline perks"],
  ["Hidden rolls", "DM-only and roller-visible dice waiting for reveal decisions"]
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="mana">Workspace</Badge>
      <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Campaign Command</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Quick actions</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/dashboard/campaigns" className="rounded-md border border-white/10 bg-black/25 px-4 py-3 text-zinc-200 hover:border-aureate/40">
              Manage campaigns
            </Link>
            <Link href="/dashboard/characters" className="rounded-md border border-white/10 bg-black/25 px-4 py-3 text-zinc-200 hover:border-mana/40">
              Build characters
            </Link>
          </div>
        </Card>
        <div className="grid gap-5 md:grid-cols-3">
          {queues.map(([title, copy]) => (
            <Card key={title}>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
