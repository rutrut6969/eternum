"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type MapSummary = { id: string; name: string; width: number; height: number; layers: unknown[]; tokens: unknown[]; encounters: unknown[] };

export function VttFoundationPanel({ campaignId, maps, canManage }: { campaignId: string; maps: MapSummary[]; canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");

  async function createMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/campaigns/${campaignId}/vtt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, width: 30, height: 30 })
    });
    if (response.ok) {
      setName("");
      router.refresh();
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">VTT foundation</h2>
        <Badge tone="violet">data layer only</Badge>
      </div>
      {canManage ? (
        <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={createMap}>
          <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Map name" required />
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Create map record</button>
        </form>
      ) : null}
      <div className="mt-5 grid gap-3">
        {maps.length === 0 ? <p className="text-sm text-zinc-300">No map records yet. Rendering, lighting, and full VTT tools are planned later.</p> : null}
        {maps.map((map) => (
          <div key={map.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <h3 className="font-bold text-white">{map.name}</h3>
            <p className="mt-1 text-sm text-zinc-400">{map.width} x {map.height} grid - {map.layers.length} layers - {map.tokens.length} tokens - {map.encounters.length} encounters</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
