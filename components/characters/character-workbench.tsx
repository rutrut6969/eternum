"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResourceBars } from "@/components/resource-bars";
import { GameplayEditors } from "@/components/characters/gameplay-editors";
import { calculateMana, calculateStamina, type CastingAbility } from "@/lib/rules/resources";

type CampaignOption = { id: string; name: string; roles: string[] };
type CharacterSummary = {
  id: string;
  campaignId: string | null;
  name: string;
  ancestry: string | null;
  className: string | null;
  level: number;
  castingAbility: CastingAbility | null;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  inventory: unknown[];
  learnedSpells: unknown[];
  customSpells: unknown[];
  craftedItems: unknown[];
  disciplines: unknown[];
  traits: unknown[];
  flaws: unknown[];
  affinities: unknown[];
  tamedCreatures: unknown[];
  undeadServants: unknown[];
  professionLevels: Array<{ profession: string; level: number; xp: number }>;
  backstoryAnalyses: Array<{ id: string; status: string; dmNotes: string | null }>;
};

export function CharacterWorkbench({ campaigns, characters }: { campaigns: CampaignOption[]; characters: CharacterSummary[] }) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [name, setName] = useState("");
  const [ancestry, setAncestry] = useState("");
  const [className, setClassName] = useState("");
  const [backstory, setBackstory] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const selected = useMemo(() => characters.find((character) => character.id === selectedCharacterId) ?? characters[0], [characters, selectedCharacterId]);

  async function createCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, name, ancestry, className, castingAbility: "WIS", backstory })
    });
    if (!response.ok) {
      setMessage("Could not create character.");
      return;
    }
    setName("");
    setAncestry("");
    setClassName("");
    setBackstory("");
    setMessage("Character created.");
    router.refresh();
  }

  async function requestBackstoryAnalysis(characterId: string) {
    if (!backstory || backstory.length < 100) {
      setMessage("Backstory analysis needs at least 100 characters.");
      return;
    }
    const response = await fetch("/api/ai/backstory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, backstory })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || "Could not request AI backstory analysis.");
      return;
    }
    setMessage("Backstory suggestion saved for DM approval.");
    router.refresh();
  }

  const scores = selected
    ? {
        str: selected.strength,
        dex: selected.dexterity,
        con: selected.constitution,
        int: selected.intelligence,
        wis: selected.wisdom,
        cha: selected.charisma
      }
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.48fr_1fr]">
      <Card>
        <h2 className="text-2xl font-bold text-white">Create character</h2>
        <form className="mt-5 space-y-4" onSubmit={createCharacter}>
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} required>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" placeholder="Character name" value={name} onChange={(event) => setName(event.target.value)} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" placeholder="Ancestry" value={ancestry} onChange={(event) => setAncestry(event.target.value)} />
            <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" placeholder="Class or archetype" value={className} onChange={(event) => setClassName(event.target.value)} />
          </div>
          <textarea className="min-h-44 w-full rounded-md border border-white/10 bg-black/30 p-4 text-base text-white outline-none focus:border-mana" placeholder="Backstory for AI analysis..." value={backstory} onChange={(event) => setBackstory(event.target.value)} />
          {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
          <button className="w-full rounded-md bg-mana px-4 py-3 font-semibold text-void" disabled={campaigns.length === 0} type="submit">
            Create character
          </button>
        </form>
      </Card>

      <div className="grid gap-5">
        {characters.length > 1 ? (
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-aureate" value={selected?.id ?? ""} onChange={(event) => setSelectedCharacterId(event.target.value)}>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>{character.name}</option>
            ))}
          </select>
        ) : null}

        {selected && scores ? (
          <>
            <Card>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-aureate">Character Sheet</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{selected.name}</h2>
                  <p className="mt-1 text-sm text-zinc-300">{[selected.ancestry, selected.className].filter(Boolean).join(" - ") || "Unclassed wanderer"}</p>
                </div>
                <Badge tone="gold">Level {selected.level}</Badge>
              </div>
              <div className="mt-6">
                <ResourceBars mana={calculateMana(selected.level, scores, selected.castingAbility ?? "WIS")} stamina={calculateStamina(selected.level, scores)} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Inventory", selected.inventory.length],
                  ["Learned spells", selected.learnedSpells.length],
                  ["Custom spells", selected.customSpells.length],
                  ["Crafted items", selected.craftedItems.length],
                  ["Disciplines", selected.disciplines.length],
                  ["Tamed creatures", selected.tamedCreatures.length],
                  ["Undead servants", selected.undeadServants.length],
                  ["Traits", selected.traits.length],
                  ["Affinities", selected.affinities.length]
                ].map(([label, count]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button className="rounded-md border border-mana/30 px-4 py-3 font-semibold text-mana hover:bg-mana/10" onClick={() => requestBackstoryAnalysis(selected.id)} type="button">
                  Submit backstory analysis
                </button>
                <div className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-300">
                  Latest approvals: {selected.backstoryAnalyses.length ? selected.backstoryAnalyses.map((item) => item.status).join(", ") : "none"}
                </div>
              </div>
            </Card>
            <GameplayEditors character={selected} />
          </>
        ) : (
          <Card>
            <h2 className="text-xl font-bold text-white">No characters yet</h2>
            <p className="mt-3 text-sm text-zinc-300">Create a campaign character to unlock backstory analysis, professions, inventory, spell lists, and dice history.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
