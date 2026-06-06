"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { professions } from "@/lib/rules/professions";
import { magicDisciplines } from "@/lib/rules/disciplines";

type GameplayField =
  | "inventory"
  | "learnedSpells"
  | "customSpells"
  | "craftedItems"
  | "disciplines"
  | "traits"
  | "flaws"
  | "affinities"
  | "tamedCreatures"
  | "undeadServants";

type CharacterGameplay = {
  id: string;
  campaignId: string | null;
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
};

const editorFields: Array<{ field: GameplayField; label: string; placeholder: string }> = [
  { field: "inventory", label: "Inventory", placeholder: "Item name" },
  { field: "learnedSpells", label: "Learned Spells", placeholder: "Spell name" },
  { field: "customSpells", label: "Custom Spells", placeholder: "Custom spell name" },
  { field: "craftedItems", label: "Crafted Items", placeholder: "Crafted item name" },
  { field: "disciplines", label: "Magical Disciplines", placeholder: "Discipline" },
  { field: "traits", label: "Traits", placeholder: "Trait" },
  { field: "flaws", label: "Flaws", placeholder: "Flaw" },
  { field: "affinities", label: "Affinities", placeholder: "Affinity" },
  { field: "tamedCreatures", label: "Tamed Creatures", placeholder: "Creature" },
  { field: "undeadServants", label: "Undead Servants", placeholder: "Undead servant" }
];

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { name: String(value ?? "") };
}

function titleOf(value: unknown) {
  const record = toRecord(value);
  return String(record.name ?? record.title ?? record.profession ?? "Untitled");
}

function summaryOf(value: unknown) {
  const record = toRecord(value);
  return String(record.description ?? record.summary ?? record.source ?? record.rarity ?? "");
}

function imageOf(value: unknown) {
  const record = toRecord(value);
  return typeof record.imageUrl === "string" ? record.imageUrl : "";
}

export function GameplayEditors({ character }: { character: CharacterGameplay }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [spellSearch, setSpellSearch] = useState("");
  const [spellResults, setSpellResults] = useState<Array<Record<string, unknown>>>([]);
  const [professionDraft, setProfessionDraft] = useState<{ profession: string; level: string; xp: string }>({ profession: professions[0], level: "1", xp: "0" });
  const [message, setMessage] = useState<string | null>(null);

  async function patchGameplay(field: GameplayField, action: "add" | "remove", value?: unknown, index?: number) {
    const response = await fetch(`/api/characters/${character.id}/gameplay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, action, value, index })
    });
    if (!response.ok) {
      setMessage("Could not update character data.");
      return;
    }
    setMessage("Character data updated.");
    router.refresh();
  }

  function draftFor(field: GameplayField, key: string) {
    return drafts[field]?.[key] ?? "";
  }

  function setDraft(field: GameplayField, key: string, value: string) {
    setDrafts((current) => ({ ...current, [field]: { ...(current[field] ?? {}), [key]: value } }));
  }

  async function addFieldItem(field: GameplayField) {
    const name = draftFor(field, "name");
    if (!name) return;
    const value =
      field === "inventory"
        ? {
            name,
            type: draftFor(field, "type") || "Gear",
            rarity: draftFor(field, "rarity") || "common",
            quantity: Number(draftFor(field, "quantity") || 1),
            description: draftFor(field, "description"),
            equipped: draftFor(field, "equipped") === "true",
            imageUrl: draftFor(field, "imageUrl"),
            source: draftFor(field, "source") || "awarded"
          }
        : { name, description: draftFor(field, "description"), source: "manual" };
    await patchGameplay(field, "add", value);
    setDrafts((current) => ({ ...current, [field]: {} }));
  }

  async function searchSpells() {
    const response = await fetch(`/api/srd/spells?search=${encodeURIComponent(spellSearch)}`);
    if (!response.ok) {
      setMessage("Could not search SRD spells.");
      return;
    }
    const body = (await response.json()) as { spells: Array<Record<string, unknown>> };
    setSpellResults(body.spells);
  }

  async function saveProfession() {
    const response = await fetch(`/api/characters/${character.id}/professions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profession: professionDraft.profession,
        level: Number(professionDraft.level || 0),
        xp: Number(professionDraft.xp || 0)
      })
    });
    if (!response.ok) {
      setMessage("Could not update profession.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-5">
      {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}

      <Card>
        <h3 className="text-xl font-bold text-white">Learn SRD spell</h3>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana" value={spellSearch} onChange={(event) => setSpellSearch(event.target.value)} placeholder="Search Open5e spells" />
          <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={searchSpells} type="button">Search</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {spellResults.map((spell, index) => (
            <div key={`${spell.name}-${index}`} className="rounded-md border border-mana/20 bg-mana/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-white">{String(spell.name)}</p>
                  <p className="text-sm text-zinc-300">Tier {String(spell.tier)} - {String(spell.manaCost)} mana - {String(spell.castingTime)}</p>
                </div>
                <button className="rounded-md border border-mana/30 px-3 py-2 text-sm text-mana" onClick={() => patchGameplay("learnedSpells", "add", spell)} type="button">Learn</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-white">Profession Progress</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.4fr_0.4fr_auto]">
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.profession} onChange={(event) => setProfessionDraft((current) => ({ ...current, profession: event.target.value }))}>
            {professions.map((profession) => <option key={profession} value={profession}>{profession}</option>)}
          </select>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.level} onChange={(event) => setProfessionDraft((current) => ({ ...current, level: event.target.value }))} placeholder="Level" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.xp} onChange={(event) => setProfessionDraft((current) => ({ ...current, xp: event.target.value }))} placeholder="XP" />
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" onClick={saveProfession} type="button">Save</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {character.professionLevels.map((profession) => (
            <Badge key={profession.profession} tone="gold">{profession.profession} {profession.level}</Badge>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {editorFields.map(({ field, label, placeholder }) => (
          <Card key={field}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-white">{label}</h3>
              <Badge tone="violet">{character[field].length}</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana" value={draftFor(field, "name")} onChange={(event) => setDraft(field, "name", event.target.value)} placeholder={placeholder} />
              {field === "inventory" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "type")} onChange={(event) => setDraft(field, "type", event.target.value)} placeholder="Type" />
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "rarity")} onChange={(event) => setDraft(field, "rarity", event.target.value)} placeholder="Rarity" />
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "quantity")} onChange={(event) => setDraft(field, "quantity", event.target.value)} placeholder="Quantity" />
                  <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "source")} onChange={(event) => setDraft(field, "source", event.target.value)}>
                    <option value="awarded">Awarded</option>
                    <option value="crafted">Crafted</option>
                    <option value="imported">Imported</option>
                    <option value="homebrew">Homebrew</option>
                  </select>
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white sm:col-span-2" value={draftFor(field, "imageUrl")} onChange={(event) => setDraft(field, "imageUrl", event.target.value)} placeholder="Image URL" />
                </div>
              ) : null}
              {field === "disciplines" ? (
                <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "name")} onChange={(event) => setDraft(field, "name", event.target.value)}>
                  <option value="">Choose discipline</option>
                  {magicDisciplines.map((discipline) => <option key={discipline} value={discipline}>{discipline}</option>)}
                </select>
              ) : null}
              <textarea className="min-h-20 rounded-md border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-mana" value={draftFor(field, "description")} onChange={(event) => setDraft(field, "description", event.target.value)} placeholder="Description or notes" />
              <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={() => addFieldItem(field)} type="button">Add</button>
            </div>
            <div className="mt-4 grid gap-2">
              {character[field].map((item, index) => (
                <div key={`${field}-${index}`} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {imageOf(item) ? <img className="mb-3 aspect-video w-full rounded-md object-cover" src={imageOf(item)} alt={titleOf(item)} /> : null}
                      <p className="font-semibold text-white">{titleOf(item)}</p>
                      {summaryOf(item) ? <p className="mt-1 text-sm text-zinc-400">{summaryOf(item)}</p> : null}
                    </div>
                    <button className="rounded-md border border-crimson/30 px-3 py-2 text-sm text-crimson" onClick={() => patchGameplay(field, "remove", undefined, index)} type="button">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
