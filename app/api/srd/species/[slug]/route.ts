import { NextResponse } from "next/server";
import { fetchSrdSpeciesDetails } from "@/lib/srd";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const species = await fetchSrdSpeciesDetails(slug);
    if (!species) return NextResponse.json({ error: "SRD species not found." }, { status: 404 });
    return NextResponse.json({ species });
  } catch (error) {
    console.error("SRD species detail failed", error);
    return NextResponse.json({ error: "SRD species details are temporarily unavailable." }, { status: 503 });
  }
}

