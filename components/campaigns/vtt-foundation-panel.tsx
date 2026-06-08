"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type MapSummary = {
  id: string;
  name: string;
  description?: string | null;
  sourceType?: string;
  width: number;
  height: number;
  gridWidth?: number;
  gridHeight?: number;
  gridSize?: number;
  gridType?: string;
  approvalStatus?: string;
  visibility?: string;
  createdAt?: string;
  createdBy?: { name: string | null; username: string } | null;
  sessionTitle?: string | null;
  images?: { imageUrl: string; imageAltText?: string | null; generatedByAi?: boolean; width?: number | null; height?: number | null }[];
  tags?: { label: string }[];
  layers: unknown[];
  tokens: unknown[];
  encounters: unknown[];
};

type SessionOption = {
  id: string;
  title: string;
};

function sourceLabel(sourceType?: string) {
  if (sourceType === "UPLOAD") return "Uploaded";
  if (sourceType === "DUNGEON_SCRAWL") return "Dungeon Scrawl Imported";
  if (sourceType === "AI_BLUEPRINT") return "AI Blueprint";
  if (sourceType === "HYBRID") return "Hybrid";
  return "Manual";
}

function sourceTone(sourceType?: string) {
  if (sourceType === "UPLOAD") return "stamina";
  if (sourceType === "DUNGEON_SCRAWL") return "crimson";
  if (sourceType === "AI_BLUEPRINT") return "violet";
  if (sourceType === "HYBRID") return "mana";
  return "gold";
}

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
  const importFormRef = useRef<HTMLFormElement | null>(null);
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [importPreview, setImportPreview] = useState<null | {
    name: string;
    sourceFileName: string;
    importVersion?: string;
    grid: { width: number; height: number; cellSize?: number };
    summary: { rooms: number; walls: number; doors: number; corridors: number; layers: number; labels: number; unsupportedObjects: number };
    warnings: string[];
    successPercentage: number;
  }>(null);

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

  function onUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    const image = new Image();
    image.onload = () => setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
  }

  async function uploadMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadStatus("Uploading map...");
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (imageSize) {
      formData.set("imageWidth", String(imageSize.width));
      formData.set("imageHeight", String(imageSize.height));
    }
    const response = await fetch(`/api/campaigns/${campaignId}/maps/upload`, { method: "POST", body: formData });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUploadStatus(body.error || "Could not upload map.");
      return;
    }
    await setActiveMap(body.map.id, false);
    setUploadStatus("Uploaded and set active.");
    setUploadPreview(null);
    setImageSize(null);
    form.reset();
    router.refresh();
  }

  async function importDungeonScrawl(event?: React.FormEvent<HTMLFormElement>, confirm = false) {
    event?.preventDefault();
    setImportStatus(confirm ? "Importing Dungeon Scrawl map..." : "Parsing Dungeon Scrawl project...");
    const form = event?.currentTarget ?? importFormRef.current;
    if (!form) {
      setImportStatus("Import form is not ready.");
      return;
    }
    const formData = new FormData(form);
    if (confirm) formData.set("confirm", "true");
    const response = await fetch(`/api/campaigns/${campaignId}/maps/import/dungeon-scrawl`, { method: "POST", body: formData });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setImportStatus(body.error || "Could not import Dungeon Scrawl project.");
      return;
    }
    if (!confirm) {
      setImportPreview(body.preview);
      setImportStatus("Import preview ready. Review warnings, then confirm import.");
      return;
    }
    await setActiveMap(body.map.id, false);
    setImportPreview(null);
    setImportStatus("Dungeon Scrawl map imported and set active.");
    form.reset();
    router.refresh();
  }

  async function setActiveMap(mapId: string, refresh = true) {
    const response = await fetch(`/api/campaigns/${campaignId}/live-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeMapId: mapId })
    });
    if (response.ok) {
      setUploadStatus("Active map updated.");
      if (refresh) router.refresh();
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaign map library</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Use uploaded battlemaps immediately or create editable Eternum maps when you want structured rooms, terrain, notes, and AI-blueprint workflows.
          </p>
        </div>
        <Badge tone="violet">play-ready maps</Badge>
      </div>

      {canManage ? (
        <div className="mt-5 grid gap-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_0.8fr_auto]" onSubmit={createMap}>
            <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={name} onChange={(event) => setName(event.target.value)} placeholder="Editable map name" required />
            <select className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
              <option value="">Campaign map</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title}</option>
              ))}
            </select>
            <button className="whitespace-nowrap rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Create editable map</button>
          </form>

          <form className="rounded-lg border border-mana/20 bg-mana/5 p-3" onSubmit={uploadMap}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-white">Upload existing battlemap</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Import maps from Dungeon Scrawl, Inkarnate, Dungeondraft, Dungeon Alchemist, Wonderdraft, or any image export.</p>
              </div>
              <Badge tone="mana">fast play</Badge>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr]">
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="name" placeholder="Uploaded map name" required />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onUploadFile} required />
              <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridType" defaultValue="SQUARE">
                <option value="SQUARE">Square</option>
                <option value="HEX">Hex</option>
                <option value="NONE">No grid</option>
              </select>
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="pixelsPerCell" type="number" min="1" max="512" defaultValue="70" placeholder="px/cell" />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridWidth" type="number" min="1" max="300" defaultValue="30" placeholder="Grid width" />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridHeight" type="number" min="1" max="300" defaultValue="30" placeholder="Grid height" />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridOffsetX" type="number" defaultValue="0" placeholder="Offset X" />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="gridOffsetY" type="number" defaultValue="0" placeholder="Offset Y" />
            </div>
            {uploadPreview ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
                <img className="aspect-video w-full rounded-md border border-white/10 object-cover" src={uploadPreview} alt="Uploaded map preview" />
                <p className="text-sm text-zinc-300">{imageSize ? `${imageSize.width} x ${imageSize.height}px detected.` : "Detecting image dimensions..."}</p>
              </div>
            ) : null}
            <button className="mt-3 rounded-md border border-mana/40 px-4 py-3 font-semibold text-mana hover:bg-mana/10" type="submit">Upload and set active</button>
          </form>
          {uploadStatus ? <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-200">{uploadStatus}</p> : null}

          <form ref={importFormRef} className="rounded-lg border border-crimson/20 bg-crimson/5 p-3" onSubmit={(event) => importDungeonScrawl(event, false)}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-white">Import Dungeon Scrawl project</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Upload a `.ds` project to convert rooms, walls, doors, labels, and layers into editable Eternum map data where possible.</p>
              </div>
              <Badge tone="crimson">editable import</Badge>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_0.8fr]">
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="name" placeholder="Imported map name, optional" />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="file" type="file" accept=".ds,application/json,text/plain" required />
              <select className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" name="sessionId" defaultValue="">
                <option value="">Campaign map</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.title}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-md border border-crimson/40 px-4 py-3 font-semibold text-crimson hover:bg-crimson/10" type="submit">Preview import</button>
              {importPreview ? (
                <button className="rounded-md bg-crimson px-4 py-3 font-semibold text-white" onClick={() => importDungeonScrawl(undefined, true)} type="button">
                  Confirm import
                </button>
              ) : null}
            </div>
            {importPreview ? (
              <div className="mt-3 rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="crimson">Dungeon Scrawl Imported</Badge>
                  <Badge tone="gold">{importPreview.successPercentage}% converted</Badge>
                  <Badge tone="mana">{importPreview.grid.width} x {importPreview.grid.height}</Badge>
                </div>
                <h3 className="mt-3 font-bold text-white">{importPreview.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{importPreview.sourceFileName}{importPreview.importVersion ? ` / Version ${importPreview.importVersion}` : ""}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300 sm:grid-cols-3 lg:grid-cols-6">
                  <span className="rounded bg-black/30 p-2">Rooms: {importPreview.summary.rooms}</span>
                  <span className="rounded bg-black/30 p-2">Walls: {importPreview.summary.walls}</span>
                  <span className="rounded bg-black/30 p-2">Doors: {importPreview.summary.doors}</span>
                  <span className="rounded bg-black/30 p-2">Corridors: {importPreview.summary.corridors}</span>
                  <span className="rounded bg-black/30 p-2">Layers: {importPreview.summary.layers}</span>
                  <span className="rounded bg-black/30 p-2">Labels: {importPreview.summary.labels}</span>
                </div>
                {importPreview.summary.unsupportedObjects ? <p className="mt-3 text-sm text-aureate">Unsupported objects: {importPreview.summary.unsupportedObjects}</p> : null}
                {importPreview.warnings.length ? (
                  <ul className="mt-3 grid gap-1 text-xs text-zinc-400">
                    {importPreview.warnings.slice(0, 6).map((warning) => <li key={warning}>- {warning}</li>)}
                  </ul>
                ) : <p className="mt-3 text-sm text-stamina">No import warnings.</p>}
              </div>
            ) : null}
          </form>
          {importStatus ? <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-zinc-200">{importStatus}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {maps.length === 0 ? <p className="text-sm text-zinc-300">No maps yet. Uploading an image map is the fastest path to live play.</p> : null}
        {maps.map((map) => {
          const image = map.images?.[0];
          return (
            <div key={map.id} className="overflow-hidden rounded-md border border-white/10 bg-black/25">
              {image ? <img className="aspect-video w-full object-cover" src={image.imageUrl} alt={image.imageAltText || map.name} /> : null}
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="mana">{map.gridType?.toLowerCase() ?? "square"} grid</Badge>
                  <Badge tone={sourceTone(map.sourceType)}>{sourceLabel(map.sourceType)}</Badge>
                  <Badge tone="gold">{map.gridWidth ?? map.width} x {map.gridHeight ?? map.height}</Badge>
                  {map.approvalStatus ? <Badge tone="violet">{map.approvalStatus.replace(/_/g, " ")}</Badge> : null}
                  {image?.generatedByAi ? <Badge tone="crimson">AI image</Badge> : null}
                </div>
                <h3 className="mt-3 font-bold text-white">{map.name}</h3>
                {map.description ? <p className="mt-2 text-sm leading-6 text-zinc-300">{map.description}</p> : null}
                <p className="mt-2 text-sm text-zinc-400">
                  {map.layers.length} layers - {map.tokens.length} tokens - {map.encounters.length} encounters - {map.images?.length ?? 0} images
                  {map.sessionTitle ? ` - ${map.sessionTitle}` : ""}
                </p>
                {image?.width && image?.height ? <p className="mt-1 text-xs text-zinc-500">Image: {image.width} x {image.height}px</p> : null}
                {map.createdBy ? <p className="mt-1 text-xs text-zinc-500">Uploaded/created by {map.createdBy.name || map.createdBy.username}</p> : null}
                {map.tags?.length ? <p className="mt-2 text-xs text-zinc-500">{map.tags.map((tag) => tag.label).join(" / ")}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {canManage ? <button className="rounded-md border border-stamina/30 px-3 py-2 text-sm font-semibold text-stamina hover:bg-stamina/10" onClick={() => setActiveMap(map.id)}>Set Active</button> : null}
                  <Link className="inline-flex rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5" href={`/dashboard/campaigns/${campaignId}/play`}>
                    Open/Preview
                  </Link>
                  <Link className="inline-flex rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5" href={`/dashboard/maps/${map.id}/edit`}>
                    {map.sourceType === "UPLOAD" ? "Edit alignment" : "Open editor"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded-md border border-dashed border-white/10 bg-black/15 p-3">
          <p className="text-sm font-semibold text-white">Public map path</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Private by default. Future publishing will require ownership confirmation, review, attribution preservation, and optional marketplace listing controls.</p>
        </div>
      </div>
    </Card>
  );
}
