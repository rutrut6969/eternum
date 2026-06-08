"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";

type DraftKind = "CUSTOM_SPELL" | "CUSTOM_ITEM";
type CampaignOption = { id: string; name: string };
type CharacterOption = { id: string; name: string; campaignId: string | null };

export function HomebrewDraftForm({ kind, campaigns, characters }: { kind: DraftKind; campaigns: CampaignOption[]; characters: CharacterOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [characterId, setCharacterId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rarity, setRarity] = useState(kind === "CUSTOM_ITEM" ? "common" : "");
  const [discipline, setDiscipline] = useState("");
  const [manaIntent, setManaIntent] = useState(10);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [idea, setIdea] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const campaignCharacters = characters.filter((character) => !campaignId || character.campaignId === campaignId);
  const noun = kind === "CUSTOM_SPELL" ? "spell" : "item";

  async function submitManual(submitForReview: boolean) {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/homebrew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: kind,
        title,
        summary,
        campaignId: campaignId || undefined,
        characterId: characterId || undefined,
        rarity: rarity || undefined,
        discipline: discipline || undefined,
        imageUrl,
        imagePrompt,
        imageAltText,
        generatedByAi: false,
        body: {
          name: title,
          description: summary,
          rarity,
          discipline,
          imageUrl,
          imagePrompt,
          imageAltText,
          baseManaIntent: kind === "CUSTOM_SPELL" ? manaIntent : undefined
        },
        submitForReview
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || `Could not save ${noun}.`);
      return;
    }
    setMessage(submitForReview ? "Submitted for DM Approval." : "Saved as Draft.");
    setTitle("");
    setSummary("");
    router.refresh();
  }

  async function submitAi(submitForReview: boolean) {
    setLoading(true);
    setMessage(null);
    const endpoint = kind === "CUSTOM_SPELL" ? "/api/ai/spell" : "/api/ai/item";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea,
        campaignId: campaignId || undefined,
        characterId: characterId || undefined,
        baseManaIntent: manaIntent,
        submitForReview
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || `Could not generate ${noun}.`);
      return;
    }
    setIdea("");
    setMessage(submitForReview ? "Submitted for DM Approval." : "Saved as Draft.");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">New {noun}</h2>
          <p className="mt-1 text-sm text-zinc-400">AI assists the draft. The rules engine calculates metadata. A DM approves before campaign use.</p>
        </div>
        <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/30 p-1 text-sm">
          <button className={mode === "manual" ? "rounded bg-aureate px-3 py-2 font-semibold text-void" : "px-3 py-2 text-zinc-300"} onClick={() => setMode("manual")} type="button">Manual</button>
          <button className={mode === "ai" ? "rounded bg-aureate px-3 py-2 font-semibold text-void" : "px-3 py-2 text-zinc-300"} onClick={() => setMode("ai")} type="button">AI</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
          <option value="">Private draft</option>
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
          <option value="">No character link</option>
          {campaignCharacters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
        {kind === "CUSTOM_SPELL" ? (
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" min={1} max={120} type="number" value={manaIntent} onChange={(event) => setManaIntent(Number(event.target.value))} />
        ) : (
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={rarity} onChange={(event) => setRarity(event.target.value)} placeholder="Rarity" />
        )}
      </div>

      {mode === "manual" ? (
        <form className="mt-5 grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${noun} name`} required />
          <textarea className="min-h-28 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Description, mechanics, and intended use" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={discipline} onChange={(event) => setDiscipline(event.target.value)} placeholder="Discipline or theme" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Image URL, optional" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={imageAltText} onChange={(event) => setImageAltText(event.target.value)} placeholder="Image alt text" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Image prompt, optional" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-md border border-white/10 px-4 py-3 font-semibold text-zinc-200 hover:bg-white/5" disabled={loading || !title} type="button" onClick={() => submitManual(false)}>Save draft</button>
            <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading || !title} type="button" onClick={() => submitManual(true)}>Submit for review</button>
          </div>
        </form>
      ) : (
        <form className="mt-5 grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <textarea className="min-h-40 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder={`Describe the ${noun} you want Eternum to structure...`} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-md border border-white/10 px-4 py-3 font-semibold text-zinc-200 hover:bg-white/5" disabled={loading || idea.length < 20} type="button" onClick={() => submitAi(false)}>Save AI draft</button>
            <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading || idea.length < 20} type="button" onClick={() => submitAi(true)}>Generate and submit</button>
          </div>
        </form>
      )}
      {message ? <p className="mt-4 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
    </Card>
  );
}
