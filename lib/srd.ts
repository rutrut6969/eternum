export type Open5eSpell = {
  name: string;
  level: string;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  desc: string;
};

export type SrdSpeciesOption = {
  slug: string;
  name: string;
  description: string;
  source: string;
  sourceLabel: string;
  speed?: number | null;
  abilityScoreSuggestions: string[];
  traits: Array<{ name: string; description?: string }>;
  languages: string[];
  proficiencies: string[];
  raw: unknown;
};

const baseUrl = process.env.OPEN5E_BASE_URL || "https://api.open5e.com/v1";

export async function fetchOpen5eSpells(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", "12");

  const response = await fetch(`${baseUrl}/spells/?${params}`, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error("Unable to fetch SRD spells.");

  const data = (await response.json()) as { results: Open5eSpell[] };
  return data.results;
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  return "";
}

function list(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value).split(/[,;]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeSpecies(raw: Record<string, unknown>): SrdSpeciesOption {
  const slug = String(raw.slug || raw.index || raw.name || "species").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const traits = Array.isArray(raw.traits)
    ? raw.traits.map((trait) => typeof trait === "string" ? { name: trait } : { name: text((trait as Record<string, unknown>).name), description: text((trait as Record<string, unknown>).desc) }).filter((trait) => trait.name)
    : list(raw.traits || raw.trait_desc).map((name) => ({ name }));

  return {
    slug,
    name: String(raw.name || slug),
    description: text(raw.desc || raw.description || raw.asdesc || raw.age || ""),
    source: String(raw.document__slug || raw.document || "open5e"),
    sourceLabel: "Open5e Source / SRD-compatible",
    speed: typeof raw.speed === "number" ? raw.speed : Number(raw.speed) || null,
    abilityScoreSuggestions: list(raw.asi_desc || raw.asi || raw.ability_score_increases),
    traits,
    languages: list(raw.languages || raw.languages_desc),
    proficiencies: list(raw.proficiencies || raw.prof_desc || raw.weapon_proficiencies),
    raw
  };
}

export async function fetchSrdSpeciesOptions(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", "50");

  const response = await fetch(`${baseUrl}/races/?${params}`, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("Unable to fetch SRD species.");

  const data = (await response.json()) as { results: Array<Record<string, unknown>> };
  return data.results.map(normalizeSpecies);
}

export async function fetchSrdSpeciesDetails(slug: string) {
  const response = await fetch(`${baseUrl}/races/${encodeURIComponent(slug)}/`, { next: { revalidate: 86400 } });
  if (response.ok) return normalizeSpecies((await response.json()) as Record<string, unknown>);

  const matches = await fetchSrdSpeciesOptions(slug);
  return matches.find((species) => species.slug === slug || species.name.toLowerCase() === slug.toLowerCase()) ?? null;
}

export async function fetchSrdEntries(type?: string, search?: string) {
  if (type === "species") return fetchSrdSpeciesOptions(search);
  if (type === "spells") return fetchOpen5eSpells(search);
  return [];
}
