import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchOpen5eSpells, fetchSrdSpeciesOptions } from "@/lib/srd";

type SearchResult = {
  id: string;
  title: string;
  category: string;
  source: string;
  href: string;
  summary?: string;
  rank: number;
};

function rank(title: string, query: string) {
  const lower = title.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  if (lower.includes(q)) return 60;
  return 10;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const results: SearchResult[] = [];
  const [homebrew, maps, species, spells] = await Promise.allSettled([
    prisma.homebrewContent.findMany({
      where: {
        status: "APPROVED_PUBLIC",
        visibility: "PUBLIC_LIBRARY",
        OR: [{ title: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }]
      },
      select: { id: true, title: true, summary: true, type: true },
      take: 8
    }),
    prisma.map.findMany({
      where: {
        approvalStatus: "APPROVED_PUBLIC",
        visibility: "PUBLIC_LIBRARY",
        OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }]
      },
      select: { id: true, name: true, description: true },
      take: 6
    }),
    fetchSrdSpeciesOptions(query),
    fetchOpen5eSpells(query)
  ]);

  if (homebrew.status === "fulfilled") {
    results.push(...homebrew.value.map((item) => ({ id: item.id, title: item.title, category: item.type.replace(/_/g, " "), source: "Public homebrew", href: `/library?q=${encodeURIComponent(item.title)}&source=homebrew`, summary: item.summary ?? undefined, rank: rank(item.title, query) })));
  }
  if (maps.status === "fulfilled") {
    results.push(...maps.value.map((map) => ({ id: map.id, title: map.name, category: "Map", source: "Public maps", href: `/maps?q=${encodeURIComponent(map.name)}`, summary: map.description ?? undefined, rank: rank(map.name, query) })));
  }
  if (species.status === "fulfilled") {
    results.push(...species.value.slice(0, 8).map((item) => ({ id: item.slug, title: item.name, category: "Species", source: item.sourceLabel, href: `/library?q=${encodeURIComponent(item.name)}&source=srd`, summary: item.description, rank: rank(item.name, query) })));
  }
  if (spells.status === "fulfilled") {
    results.push(...spells.value.slice(0, 8).map((spell) => ({ id: spell.name, title: spell.name, category: "Spell", source: "Open5e Source / SRD-compatible", href: `/library?q=${encodeURIComponent(spell.name)}&source=srd&type=spells`, summary: spell.desc, rank: rank(spell.name, query) })));
  }

  results.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
  return NextResponse.json({ results: results.slice(0, 20) });
}
