export type Open5eSpell = {
  name: string;
  level: string;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  desc: string;
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
