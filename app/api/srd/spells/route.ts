import { NextResponse } from "next/server";
import { convertSrdSpellToEternum } from "@/lib/rules/eternum-spells";
import { fetchOpen5eSpells } from "@/lib/srd";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search") ?? "";
  const spells = await fetchOpen5eSpells(search);
  return NextResponse.json({
    spells: spells.map((spell) => convertSrdSpellToEternum(spell))
  });
}
