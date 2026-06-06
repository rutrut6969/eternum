import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResourceBars } from "@/components/resource-bars";
import { calculateMana, calculateStamina } from "@/lib/rules/resources";

const scores = { str: 12, dex: 14, con: 13, int: 10, wis: 16, cha: 12 };

export default function CharactersPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="mana">Character Builder</Badge>
      <h1 className="mt-5 text-4xl font-black text-white">Backstory-driven sheets</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">AI backstory analysis</h2>
          <textarea
            className="mt-5 min-h-48 w-full rounded-md border border-white/10 bg-black/30 p-4 text-sm text-white outline-none focus:border-mana"
            placeholder="Write the character backstory here..."
          />
          <button className="mt-4 rounded-md bg-mana px-5 py-3 font-semibold text-void" type="button">
            Request suggestions
          </button>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">Preview resources</h2>
          <div className="mt-5">
            <ResourceBars mana={calculateMana(3, scores, "WIS")} stamina={calculateStamina(3, scores)} />
          </div>
        </Card>
      </div>
    </main>
  );
}
