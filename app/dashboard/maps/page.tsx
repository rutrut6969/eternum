import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardMapsPage() {
  const user = await requireUser();
  const maps = await prisma.map.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { campaign: { members: { some: { userId: user.id } } } }
      ]
    },
    include: {
      campaign: { select: { name: true } },
      session: { select: { title: true } },
      images: { orderBy: { createdAt: "desc" }, take: 1 },
      tags: true
    },
    orderBy: { updatedAt: "desc" },
    take: 60
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">VTT Foundation</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Maps workspace</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Manage uploaded and future AI-generated map records for campaigns and sessions. Full VTT rendering is still planned.</p>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-white">Upload Map</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Map image attachment UI is planned on top of the existing Blob upload foundation. Use campaign VTT panels to create map records for now.</p>
          <Link className="mt-5 inline-flex whitespace-nowrap rounded-md border border-mana/30 px-4 py-3 text-sm font-semibold text-mana hover:bg-mana/10" href="/dashboard/campaigns">
            Open campaigns
          </Link>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">AI Map Generator Coming Soon</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Prompts will default to top-down, no-label, grid-aligned, high-contrast battle maps saved to Blob storage before DM approval/publication.</p>
          <Link className="mt-5 inline-flex whitespace-nowrap rounded-md border border-aureate/30 px-4 py-3 text-sm font-semibold text-aureate hover:bg-aureate/10" href="/maps">
            Browse public maps
          </Link>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <h2 className="text-xl font-bold text-white">Future AI map flow</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Prompt - OpenAI image - Blob storage - map record - campaign/session use - optional public publication. Generation remains disabled until the image model and moderation flow are wired.
          </p>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {maps.length === 0 ? (
          <Card>
            <h2 className="text-xl font-bold text-white">No map records yet</h2>
            <p className="mt-3 text-sm text-zinc-300">Create a campaign map record from a campaign dashboard to start preparing VTT data.</p>
          </Card>
        ) : null}
        {maps.map((map) => {
          const image = map.images[0];
          return (
            <Card key={map.id}>
              <div className="flex flex-wrap gap-2">
                <Badge tone="mana">{map.gridType.toLowerCase()} grid</Badge>
                <Badge tone="gold">{map.gridWidth} x {map.gridHeight}</Badge>
                <Badge tone={map.approvalStatus === "APPROVED_PUBLIC" ? "stamina" : "violet"}>{map.approvalStatus.replace(/_/g, " ")}</Badge>
              </div>
              {image ? <img className="mt-4 aspect-video w-full rounded-md object-cover" src={image.imageUrl} alt={image.imageAltText || map.name} /> : null}
              <h2 className="mt-5 text-xl font-bold text-white">{map.name}</h2>
              {map.description ? <p className="mt-3 text-sm leading-6 text-zinc-300">{map.description}</p> : null}
              <p className="mt-2 text-sm text-zinc-400">{map.campaign?.name || map.visibility.replace(/_/g, " ")}{map.session ? ` / ${map.session.title}` : ""}</p>
              {map.tags.length ? <p className="mt-3 text-xs text-zinc-500">{map.tags.map((tag) => tag.label).join(" / ")}</p> : null}
            </Card>
          );
        })}
      </section>
    </main>
  );
}
