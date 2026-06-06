import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResourceBars } from "@/components/resource-bars";
import { authOptions } from "@/lib/auth/options";
import { calculateMana, calculateStamina } from "@/lib/rules/resources";

const demoScores = { str: 14, dex: 12, con: 15, int: 16, wis: 13, cha: 10 };

const pillars = [
  ["AI Suggestion", "Backstories, spell concepts, and item ideas are shaped into structured proposals."],
  ["Rules Engine", "Eternum calculates mana, stamina, tiers, costs, tradeoffs, and balance notes."],
  ["DM Approval", "Nothing becomes campaign-usable until the DM approves it for that table."],
  ["Saved Content", "Approved material becomes private campaign content or public homebrew library entries."]
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");

  const mana = calculateMana(5, demoScores, "INT");
  const stamina = calculateStamina(5, demoScores);

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100dvh-56px)] max-w-7xl items-center gap-8 overflow-hidden px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="max-w-3xl min-w-0">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="mana">Mana rules</Badge>
            <Badge tone="violet">AI-assisted</Badge>
            <Badge tone="crimson">DM gated</Badge>
          </div>
          <h1 className="text-balance text-4xl font-black tracking-normal text-white sm:text-5xl md:text-7xl">Eternum Tabletop</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            A D&D-compatible campaign manager where arcane technology, custom professions, mana casting, stamina tactics, and public homebrew all pass through a rules-first approval flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void hover:bg-ember">
              Create account
            </Link>
            <Link href="/rules" className="whitespace-nowrap rounded-md border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5">
              Read rules
            </Link>
          </div>
        </div>

        <Card className="w-full space-y-5">
          <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.18em] text-aureate">Character Sheet</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Kael Voss, Rune Smith</h2>
            </div>
            <span className="shrink-0 self-start"><Badge tone="gold">Level 5</Badge></span>
          </div>
          <ResourceBars mana={mana} stamina={stamina} />
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
            {["Blacksmithing 3", "Arcane 2", "Mining 1"].map((item) => (
              <div key={item} className="min-w-0 rounded-md border border-white/10 bg-black/25 px-2 py-3 text-sm text-zinc-200">
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-md border border-mana/25 bg-mana/10 p-4">
            <p className="text-sm font-semibold text-mana">Spell Card</p>
            <p className="mt-1 text-xl font-bold text-white">Aether Forge Brand</p>
            <p className="mt-2 text-sm text-zinc-300">Tier 3, Action, 20 mana. Infusion can improve damage or duration with a tradeoff.</p>
          </div>
        </Card>
      </section>

      <section className="border-t border-white/10 bg-void/70 px-4 py-8 sm:px-5 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {pillars.map(([title, copy]) => (
            <Card key={title}>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
