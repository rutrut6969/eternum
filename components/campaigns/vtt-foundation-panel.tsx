"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type MapSummary = {
  id: string;
  name: string;
  description?: string | null;
  width: number;
  height: number;
  gridType?: string;
  approvalStatus?: string;
  visibility?: string;
  sessionTitle?: string | null;
  images?: { imageUrl: string; imageAltText?: string | null; generatedByAi?: boolean }[];
  tags?: { label: string }[];
  layers: unknown[];
  tokens: unknown[];
  encounters: unknown[];
};

type SessionOption = {
  id: string;
  title: string;
};

export function VttFoundationPanel({
  campaignId,
  maps,
  sessions = [],
  canManage
}: {
  campaignId: string;
  maps: MapSummary[];
  sessions?: SessionOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");

  async function createMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/campaigns/${campaignId}/vtt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sessionId: sessionId || undefined, width: 30, height: 30 })
    });
    if (response.ok) {
      setName("");
      setSessionId("");
      router.refresh();
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">VTT foundation</h2>
        <Badge tone="violet">data layer only</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        Map records can attach to the campaign or a specific session. AI generation starts with editable blueprints; image generation remains a later optional visual layer.
      </p>
      {canManage ? (
        <form className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_0.8fr_auto]" onSubmit={createMap}>
          <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Map name" required />
          <select className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            <option value="">Campaign map</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </select>
          <button className="whitespace-nowrap rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Create map record</button>
        </form>
      ) : null}
      <div className="mt-5 grid gap-3">
        {maps.length === 0 ? <p className="text-sm text-zinc-300">No map records yet. Rendering, lighting, and full VTT tools are planned later.</p> : null}
        {maps.map((map) => {
          const image = map.images?.[0];
          return (
          <div key={map.id} className="overflow-hidden rounded-md border border-white/10 bg-black/25">
            {image ? <img className="aspect-video w-full object-cover" src={image.imageUrl} alt={image.imageAltText || map.name} /> : null}
            <div className="p-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="mana">{map.gridType?.toLowerCase() ?? "square"} grid</Badge>
                <Badge tone="gold">{map.width} x {map.height}</Badge>
                {map.approvalStatus ? <Badge tone="violet">{map.approvalStatus.replace(/_/g, " ")}</Badge> : null}
                {image?.generatedByAi ? <Badge tone="crimson">AI image</Badge> : null}
              </div>
              <h3 className="mt-3 font-bold text-white">{map.name}</h3>
              {map.description ? <p className="mt-2 text-sm leading-6 text-zinc-300">{map.description}</p> : null}
              <p className="mt-2 text-sm text-zinc-400">
                {map.layers.length} layers - {map.tokens.length} tokens - {map.encounters.length} encounters - {map.images?.length ?? 0} images
                {map.sessionTitle ? ` - ${map.sessionTitle}` : ""}
              </p>
              {map.tags?.length ? <p className="mt-2 text-xs text-zinc-500">{map.tags.map((tag) => tag.label).join(" / ")}</p> : null}
              <Link className="mt-3 inline-flex rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5" href={`/dashboard/maps/${map.id}/edit`}>
                Open editor
              </Link>
            </div>
          </div>
          );
        })}
        <div className="rounded-md border border-dashed border-white/10 bg-black/15 p-3">
          <p className="text-sm font-semibold text-white">AI blueprint builder</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Prompt - structured blueprint - validation - editable layers - DM edits - optional public publish.</p>
        </div>
      </div>
    </Card>
  );
}
