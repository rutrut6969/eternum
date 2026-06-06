import { ContentType, Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

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

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = clean(valueOf(params.q));
  const type = clean(valueOf(params.type));
  const rarity = clean(valueOf(params.rarity));
  const discipline = clean(valueOf(params.discipline));
  const profession = clean(valueOf(params.profession));
  const creator = clean(valueOf(params.creator));
  const campaign = clean(valueOf(params.campaign));
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
  let libraryError: string | null = null;

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

  const filtered = items
    .filter((item) => !query || textIncludes(item.title, query) || textIncludes(item.summary, query))
    .filter((item) => !profession || JSON.stringify(item.professionRequirements ?? []).toLowerCase().includes(profession.toLowerCase()))
    .filter((item) => !creator || textIncludes(item.author.username, creator) || textIncludes(item.author.name, creator))
    .filter((item) => !campaign || textIncludes(item.campaign?.name, campaign))
    .slice(0, 60);

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="gold">Public Homebrew</Badge>
      <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Library</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Browse DM-approved public spells, items, recipes, monsters, profession perks, and disciplines from Eternum tables.
      </p>

      <form className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-charcoal/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="q" defaultValue={query ?? ""} placeholder="Name or description" />
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="type" defaultValue={safeType ?? ""}>
          <option value="">All types</option>
          <option value="CUSTOM_SPELL">Spells</option>
          <option value="CUSTOM_ITEM">Items</option>
          <option value="CRAFTING_RECIPE">Recipes</option>
          <option value="MONSTER_NPC">Monsters/NPCs</option>
          <option value="PROFESSION_PERK">Profession perks</option>
          <option value="MAGICAL_DISCIPLINE">Disciplines</option>
        </select>
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="rarity" defaultValue={rarity ?? ""} placeholder="Rarity" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="discipline" defaultValue={discipline ?? ""} placeholder="Discipline" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="profession" defaultValue={profession ?? ""} placeholder="Profession requirement" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="creator" defaultValue={creator ?? ""} placeholder="Creator" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="campaign" defaultValue={campaign ?? ""} placeholder="Campaign source" />
        <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Search</button>
      </form>

      {libraryError ? (
        <div className="mt-8">
          <Card>
            <h2 className="text-xl font-bold text-white">Library temporarily unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{libraryError}</p>
          </Card>
        </div>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {!libraryError && filtered.length === 0 ? (
          <Card>
            <h2 className="text-xl font-bold text-white">No public homebrew found</h2>
            <p className="mt-3 text-sm text-zinc-300">Approved public content will appear here after DM publication.</p>
          </Card>
        ) : null}
        {filtered.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap gap-2">
              <Badge tone={item.type === "CUSTOM_SPELL" ? "mana" : "violet"}>{item.type.replace(/_/g, " ")}</Badge>
              {item.rarity ? <Badge tone="gold">{item.rarity}</Badge> : null}
              {item.discipline ? <Badge tone="crimson">{item.discipline}</Badge> : null}
            </div>
            {item.imageUrl ? <img className="mt-4 aspect-video w-full rounded-md object-cover" src={item.imageUrl} alt={item.imageAltText || item.title} /> : null}
            <h2 className="mt-5 text-2xl font-bold text-white">{item.title}</h2>
            {item.summary ? <p className="mt-3 text-sm leading-6 text-zinc-300">{item.summary}</p> : null}
            <p className="mt-4 text-xs text-zinc-500">
              By {item.author.name || item.author.username}
              {item.campaign?.name ? ` - ${item.campaign.name}` : ""}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
