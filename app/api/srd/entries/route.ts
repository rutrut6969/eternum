import { NextResponse } from "next/server";
import { fetchSrdEntries } from "@/lib/srd";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? undefined;
  const search = params.get("search") ?? undefined;

  try {
    const entries = await fetchSrdEntries(type, search);
    return NextResponse.json({ entries, sourceLabel: "Open5e Source / SRD-compatible" });
  } catch (error) {
    console.error("SRD entries query failed", error);
    return NextResponse.json({ error: "SRD entries are temporarily unavailable." }, { status: 503 });
  }
}

