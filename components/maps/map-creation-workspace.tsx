"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function MapCreationWorkspace() {
  const router = useRouter();
  const [name, setName] = useState("Ruined crypt");
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(30);
  const [prompt, setPrompt] = useState("Create a ruined goblin crypt with 5 rooms and a hidden necromancer chamber.");
  const [status, setStatus] = useState("");

  async function createManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating manual map...");
    const response = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        gridWidth: width,
        gridHeight: height,
        sourceType: "MANUAL",
        editorState: { zoom: 1, pan: { x: 0, y: 0 }, selectedTool: "select", showGrid: true }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error || "Could not create map.");
      return;
    }
    router.push(`/dashboard/maps/${body.map.id}/edit`);
  }

  async function createAiBlueprint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Generating editable AI blueprint...");
    const response = await fetch("/api/ai/map-blueprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width, height, saveDraft: true })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error || "Could not generate blueprint.");
      return;
    }
    router.push(`/dashboard/maps/${body.map.id}/edit`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <Badge tone="mana">Manual builder</Badge>
        <h2 className="mt-4 text-2xl font-bold text-white">Start from a blank grid</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">Create a structured map record with editable layer data. Add rooms, terrain, notes, spawn points, and secrets in the builder.</p>
        <form className="mt-5 grid gap-3" onSubmit={createManual}>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Map name" required />
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" type="number" min={5} max={200} value={width} onChange={(event) => setWidth(Number(event.target.value))} aria-label="Grid width" />
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" type="number" min={5} max={200} value={height} onChange={(event) => setHeight(Number(event.target.value))} aria-label="Grid height" />
          </div>
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Create blank map</button>
        </form>
      </Card>

      <Card>
        <Badge tone="violet">AI blueprint</Badge>
        <h2 className="mt-4 text-2xl font-bold text-white">Generate an editable draft</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">AI returns structured JSON for rooms, corridors, hazards, notes, and spawn points. Eternum validates the blueprint before saving it.</p>
        <form className="mt-5 grid gap-3" onSubmit={createAiBlueprint}>
          <textarea className="min-h-36 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <button className="rounded-md border border-violet/40 px-4 py-3 font-semibold text-violet hover:bg-violet/10" type="submit">Generate editable blueprint</button>
        </form>
      </Card>

      <Card>
        <Badge tone="gold">Uploaded image</Badge>
        <h2 className="mt-4 text-xl font-bold text-white">Use an image as reference</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">Uploaded maps remain supported through `MapImage`. The image can become a base/reference layer while editable grid data stays in layers.</p>
      </Card>

      <Card>
        <Badge tone="stamina">Hybrid workflow</Badge>
        <h2 className="mt-4 text-xl font-bold text-white">AI draft, DM edits</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">The intended Eternum workflow is AI blueprint first, DM edits second, then campaign/session attachment or public publication later.</p>
      </Card>

      {status ? <p className="lg:col-span-2 rounded-md border border-white/10 bg-black/30 p-3 text-sm text-zinc-200">{status}</p> : null}
    </div>
  );
}

