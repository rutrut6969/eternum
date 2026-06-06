import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const lanes = [
  { title: "My Drafts", statuses: ["DRAFT"] },
  { title: "Pending Review", statuses: ["PENDING_DM_REVIEW", "NEEDS_CHANGES"] },
  { title: "Approved Private", statuses: ["APPROVED_PRIVATE"] },
  { title: "Published Public", statuses: ["APPROVED_PUBLIC"] },
  { title: "Rejected/Archived", statuses: ["REJECTED", "ARCHIVED"] }
];

export default async function HomebrewWorkspacePage() {
  const user = await requireUser();
  const items = await prisma.homebrewContent.findMany({
    where: { authorId: user.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 80
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="violet">Creator Tools</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Homebrew workspace</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Draft spells, items, recipes, creatures, NPCs, and future discipline perks before sending them through DM review.</p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link className="rounded-lg border border-white/10 bg-black/25 p-4 font-semibold text-white hover:bg-white/5" href="/dashboard/homebrew/spells/new">New Spell</Link>
        <Link className="rounded-lg border border-white/10 bg-black/25 p-4 font-semibold text-white hover:bg-white/5" href="/dashboard/homebrew/items/new">New Item</Link>
        <Link className="rounded-lg border border-white/10 bg-black/25 p-4 font-semibold text-white hover:bg-white/5" href="/dashboard/homebrew?type=recipe">New Recipe</Link>
        <Link className="rounded-lg border border-white/10 bg-black/25 p-4 font-semibold text-zinc-400 hover:bg-white/5" href="/dashboard/homebrew?type=npc">New Creature/NPC placeholder</Link>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-5">
        {lanes.map((lane) => {
          const laneItems = items.filter((item) => lane.statuses.includes(item.status));
          return (
            <Card key={lane.title} className="xl:min-h-80">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">{lane.title}</h2>
                <Badge tone="mana">{laneItems.length}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {laneItems.length === 0 ? <p className="text-sm text-zinc-500">No entries.</p> : null}
                {laneItems.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                    <Badge tone={item.type === "CUSTOM_SPELL" ? "mana" : "gold"}>{item.type.replace(/_/g, " ")}</Badge>
                    <h3 className="mt-3 font-bold text-white">{item.title}</h3>
                    {item.summary ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-400">{item.summary}</p> : null}
                    <p className="mt-3 text-xs text-zinc-500">{item.campaign?.name || item.visibility.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
