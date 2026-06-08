import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const pillars = [
  ["Classless progression", "Characters grow through attributes, professions, disciplines, training, research, knowledge, and campaign experience instead of being locked into a starting class box."],
  ["DM-controlled AI", "AI can draft backstories, spells, NPCs, monsters, maps, summaries, and lore, but the rules engine calculates mechanics and the DM approves campaign impact."],
  ["Persistent campaign memory", "Sessions, notes, loot, NPCs, character milestones, and decisions are designed to become searchable campaign history instead of scattered chat logs."],
  ["VTT-ready gameplay", "Maps, tokens, dice, session tools, notes, approvals, and future combat automation all live in one app shell built for live table play."]
];

const roadmap = [
  ["Now", "Mobile-first app shell, accounts, campaigns, character workspaces, homebrew approvals, dice, SRD/Open5e references, currency, sessions, maps, and assistant foundations."],
  ["Next", "Unified assistant workflows that turn drafts into character, spell, item, NPC, monster, map, loot, and memory records through validation and approval."],
  ["Then", "Square subscriptions, Founder purchases, entitlements, creator compendiums, marketplace previews, campaign memory summaries, and richer session tooling."],
  ["Future", "Interactive maps, tokens, initiative, fog, dynamic lighting, AI image/map generation, Discord text integration, public marketplace packs, and creator revenue ledgers."]
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <div>
          <Badge tone="crimson">Vision</Badge>
          <h1 className="mt-5 max-w-4xl text-3xl font-black text-white sm:text-4xl md:text-6xl">A living tabletop engine for custom worlds.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Eternum VTT exists for groups that want D&D-compatible play without being trapped inside static sheets, fixed classes, and scattered campaign notes. It is a campaign manager, rules engine, VTT foundation, AI worldbuilding assistant, public library, and future creator marketplace built around one rule: AI suggests, the rules engine calculates, and the DM approves.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex justify-center whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void" href="/register">Create Free Account</Link>
            <Link className="inline-flex justify-center whitespace-nowrap rounded-md border border-mana/35 px-5 py-3 font-semibold text-mana" href="/pricing">View Plans</Link>
            <Link className="inline-flex justify-center whitespace-nowrap rounded-md border border-emerald-300/35 px-5 py-3 font-semibold text-emerald-200" href="/inheritance">Eternum: Inheritance</Link>
          </div>
        </div>
        <Card className="border-violet/20 bg-violet/5">
          <Badge tone="violet">Core philosophy</Badge>
          <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-lg font-black text-white">AI Suggestion</p>
            <p className="mt-2 text-sm text-zinc-400">Drafts the idea, prose, options, and structure.</p>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-lg font-black text-white">Rules Engine Calculation</p>
            <p className="mt-2 text-sm text-zinc-400">Owns mana, stamina, DCs, costs, tiers, pricing, risk, and balance notes.</p>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="text-lg font-black text-white">DM Approval</p>
            <p className="mt-2 text-sm text-zinc-400">Turns validated content into campaign-usable records.</p>
          </div>
        </Card>
      </section>

      <section id="community" className="mt-12">
        <Badge tone="mana">What Eternum is</Badge>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map(([title, copy]) => (
            <Card key={title}>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <Badge tone="gold">Why it exists</Badge>
          <h2 className="mt-4 text-3xl font-black text-white">Homebrew should be powerful without becoming chaotic.</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Tables already invent new spells, items, monsters, factions, crafting systems, and character arcs. Eternum turns that creative energy into auditable records with campaign context, approval history, and deterministic rules math. The long-term goal is to make the app feel like D&D Beyond, Roll20, and an AI campaign assistant all tuned for custom MMO-style progression.
          </p>
        </Card>
        <Card>
          <Badge tone="stamina">Community-driven ecosystem</Badge>
          <h2 className="mt-4 text-3xl font-black text-white">Creators should be able to build worlds worth sharing.</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Public homebrew, editable maps, compendiums, rulesets, asset packs, and marketplace content are planned around original creator work, SRD/Open5e-compatible sources, and Eternum-original systems. Proprietary non-SRD content is intentionally out of scope unless properly licensed.
          </p>
        </Card>
      </section>

      <section id="roadmap" className="mt-12">
        <Badge tone="crimson">Roadmap</Badge>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {roadmap.map(([phase, copy]) => (
            <Card key={phase}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-aureate">{phase}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="discord" className="mt-12 rounded-xl border border-aureate/20 bg-aureate/10 p-6 sm:p-8">
        <h2 className="text-3xl font-black text-white">The future ecosystem</h2>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-300">
          Eternum is being built toward campaigns with persistent memory, editable battle maps, character-owned progression, public libraries, paid creator compendiums, Square subscriptions and purchases, and DM-approved AI workflows that never bypass table authority.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex justify-center whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void" href="/library">Explore Library</Link>
          <Link className="inline-flex justify-center whitespace-nowrap rounded-md border border-white/15 px-5 py-3 font-semibold text-white" href="/donate">Support Development</Link>
          <Link className="inline-flex justify-center whitespace-nowrap rounded-md border border-emerald-300/35 px-5 py-3 font-semibold text-emerald-200" href="/inheritance">Explore Inheritance</Link>
        </div>
      </section>
    </main>
  );
}
