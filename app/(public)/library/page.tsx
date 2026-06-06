import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const samples = [
  { type: "Custom Spell", name: "Glassfire Mantle", rarity: "Approved Public", tone: "mana" as const },
  { type: "Custom Item", name: "Crown of the Hollow Saint", rarity: "Pending DM Review", tone: "violet" as const },
  { type: "Crafting Recipe", name: "Runesteel Ingot", rarity: "Campaign Only", tone: "gold" as const }
];

export default function LibraryPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="gold">Public Homebrew</Badge>
      <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Library</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
        Approved content can live privately in a campaign, remain user-private, or publish into the public library after DM review.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {samples.map((sample) => (
          <Card key={sample.name}>
            <Badge tone={sample.tone}>{sample.type}</Badge>
            <h2 className="mt-5 text-2xl font-bold text-white">{sample.name}</h2>
            <p className="mt-3 text-sm text-zinc-300">{sample.rarity}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
