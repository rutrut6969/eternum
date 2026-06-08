import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Eternum: Inheritance | A Living Fantasy RPG Universe",
  description: "Discover Eternum: Inheritance, the planned story-driven fantasy RPG shaped by the campaigns, characters, factions, and lore created inside EternumVTT."
};

const influenceCards = [
  ["Characters Become Legends", "Player-created heroes may inspire statues, myths, bloodlines, guild records, or histories inside the broader Eternum setting."],
  ["Campaigns Become History", "Major campaign events may inspire wars, ruins, prophecies, disasters, discoveries, or political shifts in future worldbuilding."],
  ["Factions Become Powers", "Organizations created by DMs may evolve into guilds, kingdoms, cults, orders, corporations, or hidden powers after review and adaptation."],
  ["Worlds Become Regions", "Custom campaign settings may inspire continents, cities, planes, dungeons, wilderness regions, or ancient sites within Eternum."]
];

const gameplayPillars = [
  "Story-driven RPG progression",
  "Party-based adventuring",
  "Choice-driven quests",
  "Faction reputation",
  "Character relationships",
  "Tactical combat",
  "Exploration",
  "Crafting and professions",
  "Magic, mana, stamina, and discipline systems",
  "Player legacy and world consequences"
];

const systems = [
  ["Mana System", "Magic is powered by mana rather than traditional spell slots, creating space for flexible casting, infusion, risk, and character specialization."],
  ["Stamina System", "Physical abilities, weapon techniques, dodges, movement bursts, and martial powers draw from stamina instead of being treated as static actions only."],
  ["Professions", "Characters may progress through blacksmithing, alchemy, enchanting, mining, hunting, engineering, runecrafting, and crafting."],
  ["Disciplines", "Characters develop specialized paths such as Rune Smithing, Blood Magic, Beast Mastery, Arcane Engineering, Chronomancy, Necromancy, and Void Channeling."],
  ["Legacy System", "Player choices may affect bloodlines, factions, regions, future quests, and historical memory across the evolving world."]
];

const statusCards = ["Concept Phase", "Lore Foundation", "Mechanics Design", "VTT Integration", "Community Worldbuilding"];

const supportMethods = [
  "Subscribe to EternumVTT",
  "Purchase Founder lifetime access",
  "Donate to the project",
  "Run campaigns",
  "Create lore",
  "Share feedback",
  "Invite players and DMs"
];

function ProcessStep({ index, title, copy }: { index: number; title: string; copy: string }) {
  return (
    <div className="relative rounded-lg border border-white/10 bg-black/30 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-sm font-black text-emerald-200">{index}</div>
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
    </div>
  );
}

export default function InheritancePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100dvh-56px)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="violet">Future RPG vision</Badge>
            <Badge tone="mana">Born from VTT lore</Badge>
            <Badge tone="stamina">Concept phase</Badge>
          </div>
          <h1 className="mt-5 text-balance text-4xl font-black tracking-normal text-white sm:text-5xl md:text-7xl">Eternum: Inheritance</h1>
          <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-emerald-100">
            A future fantasy RPG born from the stories created inside EternumVTT.
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Eternum: Inheritance is the planned video game expansion of the Eternum universe - a story-driven fantasy RPG shaped by the campaigns, worlds, factions, characters, and legends created through EternumVTT.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/register" className="inline-flex justify-center whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void hover:bg-ember">Join EternumVTT</Link>
            <Link href="/about" className="inline-flex justify-center whitespace-nowrap rounded-md border border-mana/35 px-5 py-3 font-semibold text-mana hover:bg-mana/10">Explore the Vision</Link>
            <Link href="/donate" className="inline-flex justify-center whitespace-nowrap rounded-md border border-emerald-300/35 px-5 py-3 font-semibold text-emerald-200 hover:bg-emerald-300/10">Support Development</Link>
          </div>
        </div>

        <Card className="overflow-hidden border-emerald-300/20 bg-[radial-gradient(circle_at_30%_15%,rgba(94,234,212,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.18),transparent_32%),rgba(7,7,12,0.9)]">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <div className="grid aspect-[4/3] min-h-[280px] gap-2 rounded-lg border border-white/10 bg-[#080812] p-3">
              <div className="grid grid-cols-[1fr_0.65fr] gap-2">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">World map</p>
                  <div className="mt-6 h-24 rounded-[45%_55%_60%_40%] border border-aureate/40 bg-aureate/10" />
                  <div className="ml-auto mt-3 h-16 w-28 rounded-[50%_40%_55%_45%] border border-violet/40 bg-violet/10" />
                </div>
                <div className="grid gap-2">
                  <div className="rounded-lg border border-violet/25 bg-violet/10 p-3">
                    <p className="text-xs text-violet">Character lineages</p>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="h-16 w-8 rounded-t-full bg-zinc-600/70" />
                      <span className="h-20 w-9 rounded-t-full bg-aureate/45" />
                      <span className="h-14 w-7 rounded-t-full bg-emerald-300/45" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-aureate/25 bg-aureate/10 p-3 text-xs leading-5 text-zinc-300">
                    Campaign lore - curated canon - game world
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-zinc-300">Arcane ruins</div>
                <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-zinc-300">Faction wars</div>
                <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-zinc-300">Living legends</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="border-y border-white/10 bg-void/75 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Badge tone="gold">What is it?</Badge>
          <div className="mt-5 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <h2 className="text-3xl font-black text-white sm:text-5xl">A roleplaying game where the world remembers.</h2>
            <div className="space-y-4 text-sm leading-7 text-zinc-300">
              <p>
                Eternum: Inheritance is planned as a fantasy roleplaying game where kingdoms rise, factions fall, ancient powers awaken, and the stories told by real players may become part of the foundation that shapes the game's future.
              </p>
              <p>
                It is intended to be story-driven, choice-focused, tabletop-inspired, connected to lore developed through EternumVTT, and designed around evolving world history.
              </p>
              <p className="rounded-lg border border-aureate/20 bg-aureate/10 p-4 text-aureate">
                Eternum: Inheritance is a long-term concept and pre-development vision, not a released game or a promised launch window.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <Badge tone="mana">Living lore pipeline</Badge>
        <h2 className="mt-4 max-w-4xl text-3xl font-black text-white sm:text-5xl">The table creates the sparks. The canon is reviewed, curated, and refined.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ProcessStep index={1} title="DMs create campaigns" copy="Campaigns establish worlds, conflicts, tone, factions, locations, monsters, artifacts, and mysteries." />
          <ProcessStep index={2} title="Players create characters" copy="Backstories, relationships, choices, victories, failures, and rivalries give the world human texture." />
          <ProcessStep index={3} title="Campaigns generate lore" copy="Session play creates events, ruins, villains, alliances, wars, discoveries, and consequences." />
          <ProcessStep index={4} title="Lore can be submitted" copy="Future opt-in workflows may let DMs and players submit selected worldbuilding for possible review." />
          <ProcessStep index={5} title="The team curates canon" copy="Submitted ideas may be reviewed, adapted, remixed, credited, refined, or declined before official use." />
          <ProcessStep index={6} title="Inheritance draws fuel" copy="Approved worldbuilding may inspire official history, regions, factions, myths, quests, and setting texture." />
        </div>
        <p className="mt-6 rounded-lg border border-crimson/20 bg-crimson/10 p-4 text-sm leading-6 text-zinc-300">
          Not every campaign automatically becomes official canon. Eternum's team may review, curate, adapt, or remix submitted lore before it becomes part of the official setting.
        </p>
      </section>

      <section className="border-y border-white/10 bg-charcoal/45 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Badge tone="violet">How players influence the world</Badge>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Heroes, villains, artifacts, and ruins can echo forward.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {influenceCards.map(([title, copy]) => (
              <Card key={title}>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <Badge tone="stamina">Core game design vision</Badge>
        <div className="mt-5 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-black text-white sm:text-5xl">A cinematic RPG shaped by Eternum systems.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-300">
              The planned game vision explores tabletop-inspired choice, tactical party play, player legacy, professions, factions, and the mana/stamina mechanics being tested inside EternumVTT.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {gameplayPillars.map((pillar) => (
              <div key={pillar} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-medium text-zinc-200">{pillar}</div>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {systems.map(([title, copy]) => (
            <Card key={title}>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-void/80 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Badge tone="gold">From VTT to video game</Badge>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">The VTT Builds the World. The Game Lets You Walk Through It.</h2>
          <p className="mt-5 max-w-4xl text-sm leading-7 text-zinc-300">
            EternumVTT is where the universe begins. DMs and players create the stories, populate the world, test mechanics, build factions, and discover what makes the setting interesting. Eternum: Inheritance is planned as the future video game expression of that world.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {["EternumVTT", "Campaign Lore", "Curated Canon", "Game World", "Eternum: Inheritance"].map((step, index) => (
              <div key={step} className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-center">
                <p className="text-xs text-emerald-200">Step {index + 1}</p>
                <p className="mt-2 font-bold text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <Badge tone="mana">Community canon system</Badge>
            <h2 className="mt-4 text-3xl font-black text-white">Opt-in lore, reviewed with care.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Future plans include lore submissions, canon review, creator credits, featured campaigns, official lore adaptation, public world archives, community highlighting, and DM-controlled permission for lore use.
            </p>
            <p className="mt-4 rounded-lg border border-mana/20 bg-mana/10 p-4 text-sm leading-6 text-mana">
              Lore contribution should be opt-in. DMs and players should control whether their campaign content is submitted for possible official use.
            </p>
          </Card>
          <Card>
            <Badge tone="crimson">Development status</Badge>
            <h2 className="mt-4 text-3xl font-black text-white">A long-term development vision.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              Eternum: Inheritance is currently a long-term development vision. The first priority is building EternumVTT into a strong platform for campaigns, worldbuilding, homebrew creation, and community lore. As the VTT grows, the foundation for the video game will grow with it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {statusCards.map((status) => <Badge key={status} tone="violet">{status}</Badge>)}
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-white/10 bg-charcoal/45 px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Badge tone="gold">Why support Eternum?</Badge>
            <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">Supporting the VTT supports the larger universe.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-300">
              The stronger EternumVTT becomes, the more infrastructure exists for campaigns, lore, mechanics, maps, community content, and eventually the long-term dream of Eternum: Inheritance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {supportMethods.map((method) => (
              <div key={method} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-medium text-zinc-200">{method}</div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-7xl rounded-lg border border-aureate/20 bg-aureate/10 p-4 text-sm leading-6 text-zinc-300">
          Donations are separate from subscriptions and do not automatically grant premium access. Founder lifetime access is purchased separately through the Pricing page when Square checkout is configured.
        </div>
      </section>

      <section className="px-4 py-12 text-center sm:px-5 sm:py-16">
        <h2 className="text-3xl font-black text-white sm:text-5xl">Help Write the History of Eternum</h2>
        <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
          Every campaign has the potential to become more than a private story. The heroes, villains, wars, ruins, artifacts, and legends created inside EternumVTT may one day help shape the world of Eternum: Inheritance.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/register" className="inline-flex justify-center whitespace-nowrap rounded-md bg-aureate px-5 py-3 font-semibold text-void">Start a Campaign</Link>
          <Link href="/register" className="inline-flex justify-center whitespace-nowrap rounded-md border border-white/15 px-5 py-3 font-semibold text-white">Create an Account</Link>
          <Link href="/donate" className="inline-flex justify-center whitespace-nowrap rounded-md border border-emerald-300/35 px-5 py-3 font-semibold text-emerald-200">Support Development</Link>
          <Link href="/pricing" className="inline-flex justify-center whitespace-nowrap rounded-md border border-mana/35 px-5 py-3 font-semibold text-mana">View Pricing</Link>
        </div>
      </section>
    </main>
  );
}
