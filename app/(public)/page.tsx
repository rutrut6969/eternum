import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResourceBars } from "@/components/resource-bars";
import { GlobalSearch } from "@/components/search/global-search";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { calculateMana, calculateStamina } from "@/lib/rules/resources";

const demoScores = { str: 14, dex: 12, con: 15, int: 16, wis: 13, cha: 10 };

const features = [
  ["Character Creation", "Classless sheets, ancestries, mana/stamina, profession progress, traits, flaws, affinities, inventory, and spells."],
  ["Campaign Management", "Sessions, notes, player management, invites, approvals, activity feeds, timeline, dice, and settings."],
  ["Homebrew Creation", "Spells, items, recipes, monsters, NPCs, disciplines, professions, maps, and public publishing workflows."],
  ["AI Assistance", "Backstories, NPCs, lore, quests, map blueprints, rules help, session summaries, and worldbuilding drafts."],
  ["Public Publishing", "Browse community creations, publish approved content, and prepare for creator compendiums and marketplace packs."]
];

const comparisons = [
  ["Traditional notes", "Freeform but hard to search, approve, reuse, or attach to character/campaign data.", "Structured records, approvals, search, and campaign ownership."],
  ["PDF binders", "Great for reading, painful for living homebrew and changing campaign state.", "Editable sheets, maps, dice, notes, wallets, and public/private libraries."],
  ["Generic wikis", "Good lore storage, weak gameplay rules, rolls, permissions, and table workflow.", "Rules-engine math, DM gates, AI drafting, and VTT foundations."]
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");

  const [characterCount, campaignCount, homebrewCount, publicHomebrew] = await Promise.all([
    prisma.character.count().catch(() => 0),
    prisma.campaign.count().catch(() => 0),
    prisma.homebrewContent.count().catch(() => 0),
    prisma.homebrewContent.findMany({
      where: { status: "APPROVED_PUBLIC", visibility: "PUBLIC_LIBRARY" },
      include: { author: { select: { name: true, username: true } } },
      orderBy: { publishedAt: "desc" },
      take: 3
    }).catch(() => [])
  ]);

  const mana = calculateMana(5, demoScores, "INT");
  const stamina = calculateStamina(5, demoScores);
  const examples = [
    { title: "Kael Voss, Rune Smith", type: "Example Character", copy: "A classless arcane blacksmith who grows through professions, research, attributes, and campaign milestones." },
    { title: "Aether Forge Brand", type: "Example Spell", copy: "Tier 3 action spell, 20 mana, with infusion upgrades and tradeoffs calculated by Eternum rules." },
    { title: "Moonlit Iron Sigil", type: "Example Item", copy: "A crafted relic with rarity, materials, profession requirements, image prompt, and DM approval status." },
    { title: "The Ashen March", type: "Example World", copy: "A grim frontier of necromancy, mining guilds, public lore, hidden DM notes, and session memory." }
  ];

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100dvh-56px)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="max-w-3xl min-w-0">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="mana">AI-assisted VTT</Badge>
            <Badge tone="violet">Classless progression</Badge>
            <Badge tone="crimson">DM controlled</Badge>
          </div>
          <h1 className="text-balance text-4xl font-black tracking-normal text-white sm:text-5xl md:text-7xl">Build Worlds. Create Legends. Run Campaigns.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Eternum combines character management, campaign tools, worldbuilding, homebrew creation, AI assistance, and collaborative storytelling into a single platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void hover:bg-ember">Create Free Account</Link>
            <Link href="/library" className="whitespace-nowrap rounded-md border border-mana/30 px-5 py-3 font-semibold text-mana hover:bg-mana/10">Explore Public Library</Link>
            <a href="#demo" className="whitespace-nowrap rounded-md border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5">Watch Demo</a>
          </div>
          <div className="mt-7 max-w-xl">
            <GlobalSearch compact />
          </div>
        </div>

        <Card className="w-full space-y-5">
          <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.18em] text-aureate">Live Preview</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Kael Voss, Rune Smith</h2>
            </div>
            <span className="shrink-0 self-start"><Badge tone="gold">Level 5</Badge></span>
          </div>
          <ResourceBars mana={mana} stamina={stamina} />
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
            {["Blacksmithing 3", "Arcane 2", "Mining 1"].map((item) => (
              <div key={item} className="min-w-0 rounded-md border border-white/10 bg-black/25 px-2 py-3 text-sm text-zinc-200">{item}</div>
            ))}
          </div>
          <div className="rounded-md border border-mana/25 bg-mana/10 p-4">
            <p className="text-sm font-semibold text-mana">Rules engine result</p>
            <p className="mt-1 text-xl font-bold text-white">Tier 3 / 20 mana / DM approval required</p>
            <p className="mt-2 text-sm text-zinc-300">AI drafts the idea. Eternum calculates the mechanics. The DM decides campaign use.</p>
          </div>
        </Card>
      </section>

      <section id="features" className="border-y border-white/10 bg-void/70 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Badge tone="gold">What you can build</Badge>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">One platform for the whole table.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {features.map(([title, copy]) => (
              <Card key={title}>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <Badge tone="mana">Why Eternum?</Badge>
        <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Built for living campaigns, not static documents.</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {comparisons.map(([title, oldWay, eternum]) => (
            <Card key={title}>
              <h3 className="text-xl font-bold text-white">Eternum vs {title}</h3>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{oldWay}</p>
              <p className="mt-4 rounded-md border border-mana/20 bg-mana/10 p-3 text-sm leading-6 text-mana">{eternum}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-white/10 bg-charcoal/50 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Characters Created", characterCount],
              ["Campaigns Hosted", campaignCount],
              ["Homebrew Entries", homebrewCount]
            ].map(([label, value]) => (
              <Card key={label}>
                <p className="text-4xl font-black text-aureate">{Number(value).toLocaleString()}</p>
                <p className="mt-2 text-sm text-zinc-400">{label}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {examples.map((example) => (
              <Card key={example.title}>
                <Badge tone="violet">{example.type}</Badge>
                <h3 className="mt-4 text-xl font-bold text-white">{example.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{example.copy}</p>
              </Card>
            ))}
          </div>
          {publicHomebrew.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {publicHomebrew.map((item) => (
                <Card key={item.id}>
                  <Badge tone="gold">Community</Badge>
                  <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                  {item.summary ? <p className="mt-3 text-sm leading-6 text-zinc-300">{item.summary}</p> : null}
                  <p className="mt-3 text-xs text-zinc-500">By {item.author.name || item.author.username}</p>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <Badge tone="crimson">Early voices</Badge>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["DM review", "Eternum is being shaped around the approval workflows DMs actually need."],
            ["Creator review", "Homebrew can become structured, searchable, and eventually publishable instead of trapped in scattered docs."],
            ["Player review", "Classless growth means my character can become what the story makes them."]
          ].map(([title, quote]) => (
            <Card key={title}>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{quote}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-void/80 px-4 py-12 text-center sm:px-5">
        <h2 className="text-3xl font-black text-white sm:text-5xl">Start Building Your World Today</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Create characters, join tables, browse public content, or support the project as Eternum grows into a full AI-powered VTT ecosystem.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="rounded-md bg-aureate px-5 py-3 font-semibold text-void">Create Account</Link>
          <Link href="/pricing" className="rounded-md border border-white/15 px-5 py-3 font-semibold text-white">View Pricing</Link>
        </div>
      </section>
    </main>
  );
}
