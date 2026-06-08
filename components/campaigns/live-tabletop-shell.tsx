"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DiceRoller } from "@/components/dice/dice-roller";
import type { MapElement } from "@/lib/maps/blueprint-schema";

type CampaignOption = { id: string; name: string; roles: string[] };
type CharacterOption = { id: string; name: string; campaignId: string | null; ownerId?: string };
type Activity = { id: string; type: string; metadata: unknown; createdAt: string; actor?: { name: string | null; username: string } | null };
type MapImageSummary = { id: string; imageUrl: string; imageAltText?: string | null; width?: number | null; height?: number | null; createdAt?: string };
type MapTokenSummary = {
  id: string;
  mapId: string;
  characterId?: string | null;
  kind: string;
  name: string;
  imageUrl?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visibility: string;
  ownerUserId?: string | null;
  controlledByUserIds?: unknown;
  hidden: boolean;
  locked: boolean;
  character?: { id: string; name: string; ownerId: string } | null;
};
type MapSummary = {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  gridType: string;
  gridWidth: number;
  gridHeight: number;
  gridSize: number;
  editorState?: Record<string, unknown> | null;
  images: MapImageSummary[];
  tags: { label: string }[];
  layers: { id?: string; name: string; order: number; visible: boolean; locked: boolean; data: unknown }[];
  tokens: MapTokenSummary[];
  createdAt?: string;
  createdBy?: { name: string | null; username: string } | null;
};
type LiveState = {
  liveState: { activeMapId: string | null; fogEnabled: boolean; gridEnabled: boolean; updatedAt: string };
  activeMap: MapSummary | null;
  fogState: { enabled: boolean; revealedRegions: unknown; hiddenRegions: unknown } | null;
  isDm: boolean;
};

type GridPoint = { x: number; y: number };
type DragToken = { id: string; pointerId: number; offset: GridPoint };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function layerElements(data: unknown): MapElement[] {
  const maybe = data as { elements?: unknown[] } | null;
  return Array.isArray(maybe?.elements) ? (maybe.elements as MapElement[]) : [];
}

function sourceBadge(sourceType: string) {
  if (sourceType === "UPLOAD") return "Uploaded";
  if (sourceType === "AI_BLUEPRINT") return "AI Blueprint";
  if (sourceType === "HYBRID") return "Hybrid";
  return "Manual";
}

function editorUploadState(map: MapSummary | null) {
  const state = map?.editorState as { uploadedMap?: { pixelsPerCell?: number; gridOffsetX?: number; gridOffsetY?: number; imageWidth?: number; imageHeight?: number } } | null;
  return state?.uploadedMap ?? {};
}

function canControlToken(token: MapTokenSummary, isDm: boolean, userId: string) {
  if (isDm) return true;
  if (token.locked || token.hidden || token.visibility === "DM_ONLY") return false;
  if (token.ownerUserId === userId || token.character?.ownerId === userId) return true;
  return asArray<string>(token.controlledByUserIds).includes(userId);
}

function renderStructuredElement(element: MapElement, cellSize: number) {
  if (element.bounds) {
    const fill = element.type === "room" ? "#3f3f46" : element.type === "terrain" ? "#166534" : element.type === "secret_area" ? "#6d28d9" : "#52525b";
    const stroke = element.secret || element.type === "secret_area" ? "#d8b4fe" : "#f1c96b";
    return (
      <rect
        key={element.id}
        x={element.bounds.x * cellSize}
        y={element.bounds.y * cellSize}
        width={element.bounds.width * cellSize}
        height={element.bounds.height * cellSize}
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
        opacity={element.type === "secret_area" ? 0.18 : 0.5}
        strokeDasharray={element.secret ? "6 4" : undefined}
      />
    );
  }
  if (element.points?.length) {
    return (
      <polyline
        key={element.id}
        points={element.points.map((point) => `${point.x * cellSize},${point.y * cellSize}`).join(" ")}
        fill="none"
        stroke={element.type === "wall" ? "#f1c96b" : "#a1a1aa"}
        strokeWidth={element.type === "wall" ? 5 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (element.position) {
    return <circle key={element.id} cx={element.position.x * cellSize} cy={element.position.y * cellSize} r="7" fill="#65d184" stroke="#bbf7d0" strokeWidth="2" />;
  }
  return null;
}

export function LiveTabletopShell({
  campaign,
  userId,
  isDm,
  initialMaps,
  initialLiveState,
  activeSession,
  characters,
  activities
}: {
  campaign: { id: string; name: string };
  userId: string;
  isDm: boolean;
  initialMaps: MapSummary[];
  initialLiveState: LiveState;
  activeSession?: { id: string; title: string; status: string } | null;
  characters: CharacterOption[];
  activities: Activity[];
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [maps, setMaps] = useState(initialMaps);
  const [state, setState] = useState(initialLiveState);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [dragToken, setDragToken] = useState<DragToken | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("Live tabletop ready.");
  const [tokenName, setTokenName] = useState("Party token");
  const [tokenCharacterId, setTokenCharacterId] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadSize, setUploadSize] = useState<{ width: number; height: number } | null>(null);

  const activeMap = state.activeMap ?? maps.find((map) => map.id === state.liveState.activeMapId) ?? null;
  const activeImage = activeMap?.images?.[0] ?? null;
  const uploadState = editorUploadState(activeMap);
  const cellSize = activeMap?.gridSize || uploadState.pixelsPerCell || 70;
  const gridOffsetX = uploadState.gridOffsetX ?? 0;
  const gridOffsetY = uploadState.gridOffsetY ?? 0;
  const canvasWidth = activeImage?.width || uploadState.imageWidth || (activeMap ? activeMap.gridWidth * cellSize : 1600);
  const canvasHeight = activeImage?.height || uploadState.imageHeight || (activeMap ? activeMap.gridHeight * cellSize : 1000);
  const visibleWidth = canvasWidth / zoom;
  const visibleHeight = canvasHeight / zoom;
  const viewBox = `${pan.x} ${pan.y} ${visibleWidth} ${visibleHeight}`;
  const activeTokens = activeMap?.tokens ?? [];
  const campaignOption: CampaignOption[] = [{ id: campaign.id, name: campaign.name, roles: isDm ? ["DM", "PLAYER"] : ["PLAYER"] }];
  const revealedRegions = asArray<{ x: number; y: number; width: number; height: number }>(state.fogState?.revealedRegions);

  const refreshLiveState = useCallback(async () => {
    const response = await fetch(`/api/campaigns/${campaign.id}/live-state`);
    if (!response.ok) return;
    const body = (await response.json()) as LiveState;
    setState(body);
    if (body.activeMap) {
      setMaps((current) => current.map((map) => map.id === body.activeMap?.id ? body.activeMap : map));
    }
  }, [campaign.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const interval = window.setInterval(refreshLiveState, 3000);
    return () => {
      document.body.style.overflow = "";
      window.clearInterval(interval);
    };
  }, [refreshLiveState]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    const worldX = pan.x + relX * visibleWidth;
    const worldY = pan.y + relY * visibleHeight;
    const nextZoom = Math.min(4, Math.max(0.25, Number((zoom * factor).toFixed(2))));
    const nextWidth = canvasWidth / nextZoom;
    const nextHeight = canvasHeight / nextZoom;
    setZoom(nextZoom);
    setPan({ x: worldX - relX * nextWidth, y: worldY - relY * nextHeight });
  }, [canvasHeight, canvasWidth, pan.x, pan.y, visibleHeight, visibleWidth, zoom]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 0.9 : 1.1);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function clientToGrid(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const worldX = pan.x + ((clientX - rect.left) / rect.width) * visibleWidth;
    const worldY = pan.y + ((clientY - rect.top) / rect.height) * visibleHeight;
    return {
      x: Math.max(0, Math.round((worldX - gridOffsetX) / cellSize)),
      y: Math.max(0, Math.round((worldY - gridOffsetY) / cellSize))
    };
  }

  async function setActiveMap(mapId: string | null) {
    const response = await fetch(`/api/campaigns/${campaign.id}/live-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeMapId: mapId })
    });
    if (response.ok) {
      const body = (await response.json()) as LiveState;
      setState(body);
      setStatus("Active map updated.");
    }
  }

  async function toggleFog(enabled: boolean) {
    const response = await fetch(`/api/campaigns/${campaign.id}/live-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fogEnabled: enabled })
    });
    if (response.ok) {
      setState((await response.json()) as LiveState);
      setStatus(enabled ? "Fog enabled." : "Fog disabled.");
    }
  }

  async function toggleGrid(enabled: boolean) {
    const response = await fetch(`/api/campaigns/${campaign.id}/live-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gridEnabled: enabled })
    });
    if (response.ok) {
      setState((await response.json()) as LiveState);
      setStatus(enabled ? "Grid enabled." : "Grid hidden.");
    }
  }

  async function revealCenter() {
    const nextRegions = [...revealedRegions, { x: canvasWidth * 0.25, y: canvasHeight * 0.25, width: canvasWidth * 0.5, height: canvasHeight * 0.5 }];
    const response = await fetch(`/api/campaigns/${campaign.id}/live-state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fogEnabled: true, revealedRegions: nextRegions })
    });
    if (response.ok) setState((await response.json()) as LiveState);
  }

  async function createToken() {
    if (!activeMap) return;
    const character = characters.find((item) => item.id === tokenCharacterId);
    const response = await fetch(`/api/campaigns/${campaign.id}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: activeMap.id,
        characterId: tokenCharacterId || undefined,
        name: character?.name || tokenName,
        x: Math.round(activeMap.gridWidth / 2),
        y: Math.round(activeMap.gridHeight / 2),
        visibility: "PARTY_VISIBLE"
      })
    });
    if (response.ok) {
      await refreshLiveState();
      setStatus("Token placed.");
    }
  }

  async function updateToken(tokenId: string, x: number, y: number) {
    const response = await fetch(`/api/campaigns/${campaign.id}/tokens`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId, x, y })
    });
    if (response.ok) await refreshLiveState();
  }

  async function uploadMap(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (uploadSize) {
      formData.set("imageWidth", String(uploadSize.width));
      formData.set("imageHeight", String(uploadSize.height));
    }
    const response = await fetch(`/api/campaigns/${campaign.id}/maps/upload`, { method: "POST", body: formData });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error || "Map upload failed.");
      return;
    }
    setMaps((current) => [body.map, ...current]);
    await setActiveMap(body.map.id);
    form.reset();
    setUploadPreview(null);
    setUploadSize(null);
    setUploadOpen(false);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    const image = new Image();
    image.onload = () => setUploadSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
  }

  function tokenPointerDown(event: React.PointerEvent<SVGGElement>, token: MapTokenSummary) {
    event.stopPropagation();
    setSelectedTokenId(token.id);
    if (!canControlToken(token, isDm, userId)) return;
    const point = clientToGrid(event.clientX, event.clientY);
    (event.currentTarget.ownerSVGElement as SVGSVGElement | null)?.setPointerCapture(event.pointerId);
    setDragToken({ id: token.id, pointerId: event.pointerId, offset: { x: point.x - token.x, y: point.y - token.y } });
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragToken || dragToken.pointerId !== event.pointerId) return;
    const point = clientToGrid(event.clientX, event.clientY);
    const x = Math.max(0, point.x - dragToken.offset.x);
    const y = Math.max(0, point.y - dragToken.offset.y);
    setState((current) => {
      if (!current.activeMap) return current;
      return {
        ...current,
        activeMap: {
          ...current.activeMap,
          tokens: current.activeMap.tokens.map((token) => token.id === dragToken.id ? { ...token, x, y } : token)
        }
      };
    });
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragToken || dragToken.pointerId !== event.pointerId) return;
    const token = state.activeMap?.tokens.find((item) => item.id === dragToken.id);
    setDragToken(null);
    if (token) void updateToken(token.id, token.x, token.y);
  }

  const activityItems = useMemo(() => activities.slice(0, 15), [activities]);

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] flex-col overflow-hidden bg-[#050509] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#080811]/95 px-3 py-2 [padding-top:max(0.5rem,env(safe-area-inset-top))]">
        <Link className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5" href={`/dashboard/campaigns/${campaign.id}`}>
          Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{campaign.name}</p>
          <p className="truncate text-xs text-zinc-500">{activeSession ? `${activeSession.title} - ${activeSession.status}` : "No active session"} / {activeMap?.name ?? "No active map"}</p>
        </div>
        <span className="hidden rounded-full border border-stamina/30 bg-stamina/10 px-2 py-1 text-xs font-semibold text-stamina sm:inline-flex">Polling live</span>
        {isDm ? <button className="rounded-md bg-aureate px-3 py-2 text-sm font-black text-void" onClick={() => setUploadOpen((value) => !value)}>Upload Map</button> : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[260px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#07070c] p-3 lg:block">
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">Party</h2>
          <div className="mt-3 grid gap-2">
            {characters.map((character) => (
              <div key={character.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="font-semibold text-white">{character.name}</p>
                <p className="text-xs text-zinc-500">HP / Mana / Stamina shortcuts coming next</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {uploadOpen ? (
            <form className="absolute left-3 top-3 z-20 grid w-[min(92vw,420px)] gap-3 rounded-lg border border-white/10 bg-[#080811] p-4 shadow-2xl shadow-black" onSubmit={uploadMap}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-black text-white">Upload battlemap</h2>
                <button className="text-sm text-zinc-400" type="button" onClick={() => setUploadOpen(false)}>Close</button>
              </div>
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="name" placeholder="Map name" required />
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFileChange} required />
              {uploadPreview ? <img className="max-h-44 rounded-md border border-white/10 object-contain" src={uploadPreview} alt="Map upload preview" /> : null}
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="gridType" defaultValue="SQUARE">
                  <option value="SQUARE">Square grid</option>
                  <option value="HEX">Hex grid</option>
                  <option value="NONE">No grid</option>
                </select>
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="pixelsPerCell" type="number" min="1" max="512" defaultValue="70" placeholder="Pixels/cell" />
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="gridWidth" type="number" min="1" max="300" defaultValue="30" placeholder="Grid width" />
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="gridHeight" type="number" min="1" max="300" defaultValue="30" placeholder="Grid height" />
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="gridOffsetX" type="number" defaultValue="0" placeholder="Offset X" />
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="gridOffsetY" type="number" defaultValue="0" placeholder="Offset Y" />
              </div>
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-sm text-white" name="source" placeholder="Source/tool notes, optional" />
              <button className="rounded-md bg-aureate px-4 py-3 font-black text-void" type="submit">Upload and activate</button>
            </form>
          ) : null}

          <div ref={canvasRef} className="h-full w-full overflow-hidden bg-[#050509]">
            {activeMap ? (
              <svg
                ref={svgRef}
                className="h-full w-full touch-none select-none"
                viewBox={viewBox}
                role="application"
                aria-label={`${activeMap.name} live tabletop map`}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
              >
                <rect x={-canvasWidth} y={-canvasHeight} width={canvasWidth * 3} height={canvasHeight * 3} fill="#050509" />
                {activeImage ? (
                  <image href={activeImage.imageUrl} x="0" y="0" width={canvasWidth} height={canvasHeight} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <rect width={canvasWidth} height={canvasHeight} fill="#09090f" stroke="rgba(241,201,107,0.2)" />
                )}
                {!activeImage ? activeMap.layers.filter((layer) => layer.visible).flatMap((layer) => layerElements(layer.data).map((element) => renderStructuredElement(element, cellSize))) : null}
                {state.liveState.gridEnabled && activeMap.gridType !== "NONE" ? (
                  <g stroke="rgba(255,255,255,0.16)" strokeWidth="1">
                    {Array.from({ length: activeMap.gridWidth + 1 }).map((_, index) => <line key={`x-${index}`} x1={gridOffsetX + index * cellSize} y1={gridOffsetY} x2={gridOffsetX + index * cellSize} y2={gridOffsetY + activeMap.gridHeight * cellSize} />)}
                    {Array.from({ length: activeMap.gridHeight + 1 }).map((_, index) => <line key={`y-${index}`} x1={gridOffsetX} y1={gridOffsetY + index * cellSize} x2={gridOffsetX + activeMap.gridWidth * cellSize} y2={gridOffsetY + index * cellSize} />)}
                  </g>
                ) : null}
                {activeTokens.map((token) => {
                  const selected = selectedTokenId === token.id;
                  const canMove = canControlToken(token, isDm, userId);
                  return (
                    <g
                      key={token.id}
                      transform={`translate(${gridOffsetX + token.x * cellSize} ${gridOffsetY + token.y * cellSize}) rotate(${token.rotation || 0})`}
                      className={canMove ? "cursor-move" : "cursor-not-allowed"}
                      opacity={token.hidden ? 0.45 : 1}
                      onPointerDown={(event) => tokenPointerDown(event, token)}
                    >
                      <circle r={(Math.max(token.width, token.height) * cellSize) / 2} fill={token.kind === "MONSTER" ? "#d94b5f" : "#54c6ff"} stroke={selected ? "#fff7ed" : "#050509"} strokeWidth={selected ? 5 : 3} />
                      <text y="5" textAnchor="middle" fill="#050509" fontSize="12" fontWeight="900">{token.name.slice(0, 2).toUpperCase()}</text>
                    </g>
                  );
                })}
                {state.liveState.fogEnabled ? (
                  <g>
                    <defs>
                      <mask id="fog-reveal-mask">
                        <rect width={canvasWidth} height={canvasHeight} fill="white" />
                        {revealedRegions.map((region, index) => <rect key={index} x={region.x} y={region.y} width={region.width} height={region.height} fill="black" />)}
                      </mask>
                    </defs>
                    <rect width={canvasWidth} height={canvasHeight} fill="black" opacity={isDm ? 0.35 : 0.82} mask="url(#fog-reveal-mask)" />
                  </g>
                ) : null}
              </svg>
            ) : (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="text-2xl font-black text-white">{isDm ? "Choose a map to begin play." : "The DM has not selected an active map yet."}</p>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">Uploaded battlemaps, manual maps, AI blueprint maps, and hybrid maps all use this same live tabletop surface.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-[380px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#07070c] p-3 xl:block">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-300">Table Tools</h2>
            <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
          </div>
          {isDm ? (
            <section className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
              <h3 className="font-bold text-white">Map selector</h3>
              <div className="mt-3 grid gap-2">
                {maps.map((map) => (
                  <div key={map.id} className={`rounded-md border p-2 ${activeMap?.id === map.id ? "border-aureate/40 bg-aureate/10" : "border-white/10 bg-black/20"}`}>
                    {map.images[0] ? <img className="aspect-video w-full rounded object-cover" src={map.images[0].imageUrl} alt={map.images[0].imageAltText || map.name} /> : null}
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{map.name}</p>
                        <p className="text-xs text-zinc-500">{sourceBadge(map.sourceType)} / {map.gridType} / {map.gridWidth}x{map.gridHeight}</p>
                      </div>
                      <button className="rounded-md border border-mana/30 px-2 py-1 text-xs font-semibold text-mana" onClick={() => setActiveMap(map.id)}>Set Active</button>
                    </div>
                    <Link className="mt-2 inline-flex text-xs text-zinc-400 hover:text-white" href={`/dashboard/maps/${map.id}/edit`}>Edit alignment</Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isDm && activeMap ? (
            <section className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
              <h3 className="font-bold text-white">Tokens and fog</h3>
              <div className="mt-3 grid gap-2">
                <select className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" value={tokenCharacterId} onChange={(event) => setTokenCharacterId(event.target.value)}>
                  <option value="">Generic token</option>
                  {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                </select>
                <input className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="Token name" />
                <button className="rounded-md border border-stamina/30 px-3 py-2 text-sm font-semibold text-stamina" onClick={createToken}>Place token</button>
                <button className="rounded-md border border-violet/30 px-3 py-2 text-sm font-semibold text-violet" onClick={() => toggleFog(!state.liveState.fogEnabled)}>{state.liveState.fogEnabled ? "Disable fog" : "Enable fog"}</button>
                <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200" onClick={revealCenter}>Reveal center</button>
                <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200" onClick={() => toggleGrid(!state.liveState.gridEnabled)}>Grid {state.liveState.gridEnabled ? "On" : "Off"}</button>
              </div>
            </section>
          ) : null}

          <section className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
            <DiceRoller campaigns={campaignOption} characters={characters} />
          </section>

          <section className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
            <h3 className="font-bold text-white">Live feed</h3>
            <div className="mt-3 max-h-64 overflow-y-auto pr-1">
              {activityItems.map((activity) => (
                <div key={activity.id} className="mb-2 rounded-md border border-white/10 bg-black/30 p-2 text-xs text-zinc-300">
                  <p className="font-semibold text-white">{activity.type.replace(/_/g, " ")}</p>
                  <p className="text-zinc-500">{activity.actor?.name || activity.actor?.username || "System"} / {new Date(activity.createdAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#080811]/95 px-3 py-2 text-xs text-zinc-400 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <span className="truncate">{status}</span>
        <span className="hidden sm:inline">Wheel zooms. Drag controlled tokens. Live state polls every 3 seconds.</span>
      </footer>
    </div>
  );
}
