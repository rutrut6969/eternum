import { ContentType, Prisma } from "@prisma/client";
import { GlobalSearch } from "@/components/search/global-search";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { fetchOpen5eSpells, fetchSrdSpeciesOptions, type Open5eSpell, type SrdSpeciesOption } from "@/lib/srd";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PublicLibraryItem = Prisma.HomebrewContentGetPayload<{
  include: {
    author: { select: { name: true; username: true } };
    campaign: { select: { name: true } };
  };
}>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function textIncludes(value: string | null | undefined, query: string | undefined) {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function excerpt(value: string | undefined | null, max = 280) {
  const cleanText = (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (cleanText.length <= max) return cleanText;
  return `${cleanText.slice(0, max - 1).trim()}...`;
}

function jsonSummary(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const candidates = [record.description, record.effect, record.stats, record.requirements, record.notes]
    .map((item) => typeof item === "string" ? item : Array.isArray(item) ? item.join(", ") : "")
    .filter(Boolean);
  return candidates.length ? candidates.slice(0, 3).join(" ") : null;
}

function spellTier(spell: Open5eSpell) {
  const level = Number(spell.level);
  if (!Number.isFinite(level) || level <= 1) return { tier: 1, mana: 5 };
  if (level <= 2) return { tier: 2, mana: 10 };
  if (level <= 4) return { tier: 3, mana: 20 };
  if (level <= 5) return { tier: 4, mana: 35 };
  if (level <= 7) return { tier: 5, mana: 55 };
  return { tier: 6, mana: 80 };
}

function FilterPanel({
  query,
  source,
  safeType,
  rarity,
  discipline,
  profession,
  creator,
  campaign
}: {
  query?: string;
  source?: string;
  safeType?: ContentType;
  rarity?: string;
  discipline?: string;
  profession?: string;
  creator?: string;
  campaign?: string;
}) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="bg-[#07070c]/90">
        <h2 className="text-lg font-bold text-white">Search the library</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Find public homebrew, public maps, SRD species, and SRD spells from one search box.</p>
        <div className="mt-4">
          <GlobalSearch compact />
        </div>
        <form className="mt-5 grid gap-3">
          <input className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="q" defaultValue={query ?? ""} placeholder="Name or description" />
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="source" defaultValue={source ?? ""}>
            <option value="">Homebrew + SRD</option>
            <option value="homebrew">Homebrew only</option>
            <option value="srd">SRD/Open5e only</option>
          </select>
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="type" defaultValue={safeType ?? ""}>
            <option value="">All homebrew types</option>
            <option value="CUSTOM_SPELL">Homebrew spells</option>
            <option value="CUSTOM_ITEM">Homebrew items</option>
            <option value="CRAFTING_RECIPE">Recipes</option>
            <option value="MONSTER_NPC">Monsters/NPCs</option>
            <option value="PROFESSION_PERK">Profession perks</option>
            <option value="MAGICAL_DISCIPLINE">Disciplines</option>
          </select>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="rarity" defaultValue={rarity ?? ""} placeholder="Rarity" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="discipline" defaultValue={discipline ?? ""} placeholder="Discipline" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="profession" defaultValue={profession ?? ""} placeholder="Profession requirement" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="creator" defaultValue={creator ?? ""} placeholder="Creator" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana/50" name="campaign" defaultValue={campaign ?? ""} placeholder="Campaign source" />
          <button className="whitespace-nowrap rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Apply filters</button>
        </form>
      </Card>
    </aside>
  );
}

function SpeciesCard({ species }: { species: SrdSpeciesOption }) {
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Badge tone="mana">SRD / Creative Commons</Badge>
        {species.speed ? <Badge tone="gold">Speed {species.speed}</Badge> : null}
      </div>
      <h3 className="mt-5 text-2xl font-bold text-white">{species.name}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{excerpt(species.description, 360) || "Open5e source reference."}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-aureate">Core stats</p>
          <p className="mt-2 text-sm text-zinc-300">Speed: {species.speed ?? "not listed"}</p>
          <p className="mt-1 text-sm text-zinc-300">Languages: {species.languages.join(", ") || "not listed"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mana">Training hooks</p>
          <p className="mt-2 text-sm text-zinc-300">{species.proficiencies.join(", ") || species.abilityScoreSuggestions.join(", ") || "Use campaign training focus."}</p>
        </div>
      </div>
      <details className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-white">Traits and features</summary>
        <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
          {species.traits.length ? species.traits.map((trait) => (
            <div key={trait.name}>
              <p className="font-semibold text-white">{trait.name}</p>
              {trait.description ? <p className="text-zinc-400">{excerpt(trait.description, 260)}</p> : null}
            </div>
          )) : <p>No traits listed by source.</p>}
        </div>
      </details>
    </Card>
  );
}

function SpellCard({ spell }: { spell: Open5eSpell }) {
  const tier = spellTier(spell);
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Badge tone="mana">Open5e Source</Badge>
        <Badge tone="gold">Tier {tier.tier}</Badge>
        <Badge tone="violet">{tier.mana} mana</Badge>
      </div>
      <h3 className="mt-5 text-2xl font-bold text-white">{spell.name}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-300">
          <p><span className="font-semibold text-white">School:</span> {spell.school || "not listed"}</p>
          <p><span className="font-semibold text-white">Casting:</span> {spell.casting_time || "not listed"}</p>
          <p><span className="font-semibold text-white">Range:</span> {spell.range || "not listed"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-300">
          <p><span className="font-semibold text-white">Duration:</span> {spell.duration || "not listed"}</p>
          <p><span className="font-semibold text-white">Original level:</span> {spell.level || "not listed"}</p>
          <p><span className="font-semibold text-white">Eternum display:</span> no spell slots</p>
        </div>
      </div>
      <details className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-white">Overview and rules text</summary>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{excerpt(spell.desc, 900) || "No spell description returned by source."}</p>
      </details>
    </Card>
  );
}

function HomebrewCard({ item }: { item: PublicLibraryItem }) {
  const summary = item.summary || jsonSummary(item.body) || jsonSummary(item.rulesResult);
  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        <Badge tone={item.type === "CUSTOM_SPELL" ? "mana" : "violet"}>{item.type.replace(/_/g, " ")}</Badge>
        {item.rarity ? <Badge tone="gold">{item.rarity}</Badge> : null}
        {item.discipline ? <Badge tone="crimson">{item.discipline}</Badge> : null}
      </div>
      {item.imageUrl ? <img className="mt-4 aspect-video w-full rounded-md object-cover" src={item.imageUrl} alt={item.imageAltText || item.title} /> : null}
      <h2 className="mt-5 text-2xl font-bold text-white">{item.title}</h2>
      {summary ? <p className="mt-3 text-sm leading-6 text-zinc-300">{excerpt(summary, 420)}</p> : null}
      <details className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-white">Mechanics and source</summary>
        <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
          <p>Creator: {item.author.name || item.author.username}</p>
          <p>Campaign: {item.campaign?.name || "public library"}</p>
          <p>Visibility: approved public</p>
          <p>Type: {item.type.replace(/_/g, " ").toLowerCase()}</p>
        </div>
      </details>
    </Card>
  );
}

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = clean(valueOf(params.q));
  const type = clean(valueOf(params.type));
  const rarity = clean(valueOf(params.rarity));
  const discipline = clean(valueOf(params.discipline));
  const profession = clean(valueOf(params.profession));
  const creator = clean(valueOf(params.creator));
  const campaign = clean(valueOf(params.campaign));
  const source = clean(valueOf(params.source));
  const contentTypes = Object.values(ContentType);
  const safeType = type && contentTypes.includes(type as ContentType) ? (type as ContentType) : undefined;

  const where: Prisma.HomebrewContentWhereInput = {
    status: "APPROVED_PUBLIC",
    visibility: "PUBLIC_LIBRARY",
    ...(safeType ? { type: safeType } : {}),
    ...(rarity ? { rarity } : {}),
    ...(discipline ? { discipline } : {})
  };

  let items: PublicLibraryItem[] = [];
  let srdSpecies: SrdSpeciesOption[] = [];
  let srdSpells: Open5eSpell[] = [];
  let libraryError: string | null = null;
  let srdError: string | null = null;

  try {
    items = await prisma.homebrewContent.findMany({
      where,
      include: {
        author: { select: { name: true, username: true } },
        campaign: { select: { name: true } }
      },
      orderBy: { publishedAt: "desc" },
      take: 100
    });
  } catch (error) {
    console.error("Public library query failed", error);
    libraryError = "The public library could not be loaded right now. Please try again after the database is synced.";
  }

  if (!source || source === "srd") {
    try {
      const [species, spells] = await Promise.all([fetchSrdSpeciesOptions(query), fetchOpen5eSpells(query)]);
      srdSpecies = species.slice(0, 8);
      srdSpells = spells.slice(0, 8);
    } catch (error) {
      console.error("SRD public library query failed", error);
      srdError = "SRD/Open5e content could not be loaded right now.";
    }
  }

  const filtered = items
    .filter((item) => !query || textIncludes(item.title, query) || textIncludes(item.summary, query) || textIncludes(jsonSummary(item.body), query))
    .filter((item) => !profession || JSON.stringify(item.professionRequirements ?? []).toLowerCase().includes(profession.toLowerCase()))
    .filter((item) => !creator || textIncludes(item.author.username, creator) || textIncludes(item.author.name, creator))
    .filter((item) => !campaign || textIncludes(item.campaign?.name, campaign))
    .slice(0, 60);

  const showHomebrew = source !== "srd";
  const showSrd = source !== "homebrew";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
      <section className="max-w-4xl">
        <Badge tone="gold">Public Library</Badge>
        <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-6xl">Readable rules, homebrew, and SRD references.</h1>
        <p className="mt-5 text-lg leading-8 text-zinc-300">
          Browse DM-approved public homebrew alongside free SRD/Open5e-compatible reference content. SRD content is labeled clearly, formatted into readable sections, and kept separate from user-created homebrew.
        </p>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
        <FilterPanel query={query} source={source} safeType={safeType} rarity={rarity} discipline={discipline} profession={profession} creator={creator} campaign={campaign} />

        <div className="min-w-0 space-y-10">
          {srdError ? (
            <Card>
              <h2 className="text-xl font-bold text-white">SRD temporarily unavailable</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{srdError}</p>
            </Card>
          ) : null}

          {showSrd ? (
            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge tone="mana">SRD / Open5e</Badge>
                  <h2 className="mt-3 text-2xl font-bold text-white">Reference compendium</h2>
                </div>
                <p className="text-sm text-zinc-500">Free SRD-compatible source data</p>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {srdSpecies.map((species) => <SpeciesCard key={species.slug} species={species} />)}
                {srdSpells.map((spell) => <SpellCard key={spell.name} spell={spell} />)}
              </div>
              {!srdError && srdSpecies.length === 0 && srdSpells.length === 0 ? (
                <Card className="mt-5">
                  <h2 className="text-xl font-bold text-white">No SRD results found</h2>
                  <p className="mt-3 text-sm text-zinc-300">Try a broader search such as “elf”, “fire”, or “healing”.</p>
                </Card>
              ) : null}
            </section>
          ) : null}

          {libraryError ? (
            <Card>
              <h2 className="text-xl font-bold text-white">Library temporarily unavailable</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{libraryError}</p>
            </Card>
          ) : null}

          {showHomebrew ? (
            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Badge tone="violet">Approved public homebrew</Badge>
                  <h2 className="mt-3 text-2xl font-bold text-white">Community creations</h2>
                </div>
                <p className="text-sm text-zinc-500">DM-approved and public only</p>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {!libraryError && filtered.length === 0 ? (
                  <Card>
                    <h2 className="text-xl font-bold text-white">No public homebrew found</h2>
                    <p className="mt-3 text-sm text-zinc-300">Approved public content will appear here after DM publication.</p>
                  </Card>
                ) : null}
                {filtered.map((item) => <HomebrewCard key={item.id} item={item} />)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
