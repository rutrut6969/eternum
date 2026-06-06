"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";

type CampaignOption = { id: string; name: string; roles: string[] };
type CharacterOption = { id: string; name: string; campaignId: string | null };

export function HomebrewBuilder({ campaigns, characters }: { campaigns: CampaignOption[]; characters: CharacterOption[] }) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [characterId, setCharacterId] = useState("");
  const [type, setType] = useState<"CUSTOM_SPELL" | "CUSTOM_ITEM">("CUSTOM_SPELL");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rarity, setRarity] = useState("common");
  const [discipline, setDiscipline] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAltText, setImageAltText] = useState("");
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [message, setMessage] = useState<string | null>(null);

  const campaignCharacters = characters.filter((character) => character.campaignId === campaignId);

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/homebrew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        summary,
        campaignId,
        characterId: characterId || undefined,
        rarity,
        discipline,
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
          imageAltText
        },
        submitForReview: true
      })
    });
    if (!response.ok) {
      setMessage("Could not submit homebrew.");
      return;
    }
    setMessage("Homebrew submitted for DM review.");
    setTitle("");
    setSummary("");
    router.refresh();
  }

  async function submitAi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = type === "CUSTOM_SPELL" ? "/api/ai/spell" : "/api/ai/item";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, campaignId, characterId: characterId || undefined, baseManaIntent: 10, submitForReview: true })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || "Could not create AI draft.");
      return;
    }
    setIdea("");
    setMessage("AI draft saved for DM review.");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Custom spell and item builder</h2>
        <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/30 p-1 text-sm">
          <button className={mode === "manual" ? "rounded bg-aureate px-3 py-2 font-semibold text-void" : "px-3 py-2 text-zinc-300"} onClick={() => setMode("manual")} type="button">Manual</button>
          <button className={mode === "ai" ? "rounded bg-aureate px-3 py-2 font-semibold text-void" : "px-3 py-2 text-zinc-300"} onClick={() => setMode("ai")} type="button">AI</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
          <option value="">No character link</option>
          {campaignCharacters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
        <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={type} onChange={(event) => setType(event.target.value as "CUSTOM_SPELL" | "CUSTOM_ITEM")}>
          <option value="CUSTOM_SPELL">Custom spell</option>
          <option value="CUSTOM_ITEM">Custom item</option>
        </select>
      </div>

      {mode === "manual" ? (
        <form className="mt-5 grid gap-3" onSubmit={submitManual}>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name" required />
          <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Description and mechanical intent" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={rarity} onChange={(event) => setRarity(event.target.value)} placeholder="Rarity" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={discipline} onChange={(event) => setDiscipline(event.target.value)} placeholder="Discipline" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Image URL" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={imageAltText} onChange={(event) => setImageAltText(event.target.value)} placeholder="Image alt text" />
          </div>
          <textarea className="min-h-20 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Image prompt for future generation" />
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Submit for review</button>
        </form>
      ) : (
        <form className="mt-5 grid gap-3" onSubmit={submitAi}>
          <textarea className="min-h-32 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Describe the spell or item idea..." required />
          <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">Generate and submit</button>
        </form>
      )}
      {message ? <p className="mt-4 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
    </Card>
  );
}
