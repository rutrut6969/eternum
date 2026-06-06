import { MapGridType, Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PublicMap = Prisma.MapGetPayload<{
  include: {
    createdBy: { select: { name: true; username: true } };
    images: true;
    tags: true;
  };
}>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function includesText(value: string | null | undefined, query: string | undefined) {
  if (!query) return true;
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

export default async function PublicMapLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = clean(valueOf(params.q));
  const environment = clean(valueOf(params.environment));
  const theme = clean(valueOf(params.theme));
  const gridType = clean(valueOf(params.gridType));
  const creator = clean(valueOf(params.creator));
  const size = clean(valueOf(params.size));
  const safeGridType = gridType && Object.values(MapGridType).includes(gridType as MapGridType) ? (gridType as MapGridType) : undefined;

  let maps: PublicMap[] = [];
  let libraryError: string | null = null;

  try {
    maps = await prisma.map.findMany({
      where: {
        approvalStatus: "APPROVED_PUBLIC",
        visibility: "PUBLIC_LIBRARY",
        ...(safeGridType ? { gridType: safeGridType } : {}),
        ...(environment ? { environment } : {}),
        ...(theme ? { theme } : {})
      },
      include: {
        createdBy: { select: { name: true, username: true } },
        images: { orderBy: { createdAt: "desc" }, take: 1 },
        tags: true
      },
      orderBy: { publishedAt: "desc" },
      take: 100
    });
  } catch (error) {
    console.error("Public map library page query failed", error);
    libraryError = "The public map library could not be loaded right now. Please try again after the database is synced.";
  }

  const filtered = maps
    .filter((map) => !query || includesText(map.name, query) || includesText(map.description, query))
    .filter((map) => !creator || includesText(map.createdBy.username, creator) || includesText(map.createdBy.name, creator))
    .filter((map) => !size || `${map.gridWidth}x${map.gridHeight}` === size.toLowerCase())
    .slice(0, 60);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
      <Badge tone="violet">Map Library</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl md:text-6xl">Public battle maps</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Browse approved VTT-ready maps. AI generation is planned as a top-down battle map workflow with Blob-stored images, prompt metadata, tags, and DM-controlled publication.
      </p>

      <form className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-charcoal/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="q" defaultValue={query ?? ""} placeholder="Name or description" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="environment" defaultValue={environment ?? ""} placeholder="Environment" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="theme" defaultValue={theme ?? ""} placeholder="Theme" />
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridType" defaultValue={safeGridType ?? ""}>
          <option value="">All grids</option>
          <option value="SQUARE">Square</option>
          <option value="HEX">Hex</option>
          <option value="NONE">None</option>
        </select>
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="size" defaultValue={size ?? ""} placeholder="Size, e.g. 30x30" />
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="creator" defaultValue={creator ?? ""} placeholder="Creator" />
        <button className="whitespace-nowrap rounded-md bg-aureate px-4 py-3 font-semibold text-void sm:col-span-2 lg:col-span-1" type="submit">Search maps</button>
      </form>

      {libraryError ? (
        <div className="mt-8">
          <Card>
            <h2 className="text-xl font-bold text-white">Map library temporarily unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{libraryError}</p>
          </Card>
        </div>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {!libraryError && filtered.length === 0 ? (
          <Card>
            <h2 className="text-xl font-bold text-white">No public maps found</h2>
            <p className="mt-3 text-sm text-zinc-300">Approved public maps will appear here after the AI/upload map workflow is connected.</p>
          </Card>
        ) : null}
        {filtered.map((map) => {
          const image = map.images[0];
          return (
            <Card key={map.id}>
              <div className="flex flex-wrap gap-2">
                <Badge tone="mana">{map.gridType.toLowerCase()} grid</Badge>
                <Badge tone="gold">{map.gridWidth} x {map.gridHeight}</Badge>
                {map.environment ? <Badge tone="violet">{map.environment}</Badge> : null}
                {map.theme ? <Badge tone="crimson">{map.theme}</Badge> : null}
              </div>
              {image ? <img className="mt-4 aspect-video w-full rounded-md object-cover" src={image.imageUrl} alt={image.imageAltText || map.name} /> : null}
              <h2 className="mt-5 text-2xl font-bold text-white">{map.name}</h2>
              {map.description ? <p className="mt-3 text-sm leading-6 text-zinc-300">{map.description}</p> : null}
              <p className="mt-4 text-xs text-zinc-500">By {map.createdBy.name || map.createdBy.username}</p>
              {map.tags.length ? <p className="mt-3 text-xs text-zinc-400">{map.tags.map((tag) => tag.label).join(" / ")}</p> : null}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
