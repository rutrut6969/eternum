import { NextResponse } from "next/server";
import { fetchSrdSpeciesOptions } from "@/lib/srd";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  try {
    const species = await fetchSrdSpeciesOptions(search);
    return NextResponse.json({ species });
  } catch (error) {
    console.error("SRD species query failed", error);
    return NextResponse.json({ error: "SRD species are temporarily unavailable." }, { status: 503 });
  }
}

