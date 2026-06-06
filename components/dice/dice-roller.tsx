"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CampaignOption = { id: string; name: string; roles: string[] };
type CharacterOption = { id: string; name: string; campaignId: string | null };
type Roll = {
  id: string;
  expression: string;
  label: string | null;
  visibility: string;
  total: number;
  revealedAt: string | null;
  createdAt: string;
  roller?: { name: string | null; email: string } | null;
  character?: { name: string } | null;
};

export function DiceRoller({ campaigns, characters }: { campaigns: CampaignOption[]; characters: CharacterOption[] }) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [characterId, setCharacterId] = useState("");
  const [expression, setExpression] = useState("1d20");
  const [label, setLabel] = useState("");
  const [visibility, setVisibility] = useState("roller_and_dm");
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId);
  const isDm = selectedCampaign?.roles.includes("DM") || selectedCampaign?.roles.includes("ASSISTANT_DM");
  const campaignCharacters = useMemo(() => characters.filter((character) => character.campaignId === campaignId), [characters, campaignId]);

  async function loadRolls() {
    if (!campaignId) return;
    const response = await fetch(`/api/dice?campaignId=${campaignId}`);
    if (response.ok) {
      const body = (await response.json()) as { rolls: Roll[] };
      setRolls(body.rolls);
    }
  }

  useEffect(() => {
    loadRolls();
  }, [campaignId]);

  async function roll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/dice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, characterId: characterId || undefined, expression, label, visibility })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Roll failed.");
      return;
    }
    setLabel("");
    await loadRolls();
  }

  async function reveal(rollId: string) {
    await fetch(`/api/dice/${rollId}`, { method: "PATCH" });
    await loadRolls();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.45fr_1fr]">
      <Card>
        <h2 className="text-2xl font-bold text-white">Dice roller</h2>
        <form className="mt-5 space-y-4" onSubmit={roll}>
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} required>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
            <option value="">Roll as user</option>
            {campaignCharacters.map((character) => (
              <option key={character.id} value={character.id}>{character.name}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="1d20+5" required />
            <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Stealth check" />
          </div>
          <select className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="dm_only">DM only</option>
            <option value="roller_and_dm">Roller and DM</option>
            <option value="party_visible">Party visible</option>
            <option value="public">Public</option>
          </select>
          {error ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{error}</p> : null}
          <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void" disabled={!campaignId} type="submit">Roll server-side</button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-white">Campaign rolls</h2>
          <Badge tone={isDm ? "gold" : "mana"}>{isDm ? "DM view" : "Player view"}</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {rolls.length === 0 ? <p className="text-sm text-zinc-300">No visible rolls yet.</p> : null}
          {rolls.map((roll) => (
            <div key={roll.id} className="rounded-md border border-white/10 bg-black/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{roll.label || roll.expression}</p>
                  <p className="text-sm text-zinc-400">{roll.character?.name || roll.roller?.name || roll.roller?.email} rolled {roll.expression}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl font-black text-aureate">{roll.total}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{roll.visibility}</p>
                </div>
              </div>
              {isDm && !roll.revealedAt && (roll.visibility === "DM_ONLY" || roll.visibility === "ROLLER_AND_DM") ? (
                <button className="mt-3 rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana" onClick={() => reveal(roll.id)} type="button">
                  Reveal to party
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
