import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { magicDisciplines, necromancyBranches } from "@/lib/rules/disciplines";
import { professions } from "@/lib/rules/professions";
import { tierManaCost } from "@/lib/rules/spells";

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="max-w-3xl">
        <Badge tone="violet">Rules Engine</Badge>
        <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Eternum Custom Systems</h1>
        <p className="mt-5 text-lg leading-8 text-zinc-300">
          Eternum replaces spell slots and static backgrounds with mana, stamina, professions, disciplines, AI-assisted suggestions, and mandatory DM approval.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-white">Mana and Stamina</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
            <p>Base Mana = 20 + character level x 5.</p>
            <p>Primary caster ability contributes modifier x 10. The other mental abilities contribute modifier x 3.</p>
            <p>Stamina = 20 + level x 5 + CON mod x 10 + STR mod x 3 + DEX mod x 3.</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Spell Tiers</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(tierManaCost).map(([tier, cost]) => (
              <div key={tier} className="rounded-md border border-mana/25 bg-mana/10 p-3">
                <p className="text-sm text-mana">Tier {tier}</p>
                <p className="text-xl font-bold text-white">{cost} mana</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Magic Disciplines</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {magicDisciplines.map((discipline) => (
              <Badge key={discipline} tone={discipline.includes("Forbidden") ? "crimson" : "violet"}>
                {discipline}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Necromancy Path</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {necromancyBranches.map((branch) => (
              <Badge key={branch} tone="crimson">
                {branch}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-2xl font-bold text-white">Professions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {professions.map((profession) => (
            <div key={profession} className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-200">
              {profession}
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 w-1/3 rounded-full bg-ember" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
