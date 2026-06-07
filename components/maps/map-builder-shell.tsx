"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MapElement, MapLayerData } from "@/lib/maps/blueprint-schema";

type EditableLayer = {
  id?: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  data: MapLayerData;
};

type EditableMap = {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  gridType: string;
  gridWidth: number;
  gridHeight: number;
  theme?: string | null;
  environment?: string | null;
  lightingNotes?: string | null;
  interactiveNotes?: string | null;
  editorState?: Record<string, unknown> | null;
  layers: EditableLayer[];
};

const tools: Array<{ type: MapElement["type"]; label: string }> = [
  { type: "room", label: "Room" },
  { type: "corridor", label: "Corridor" },
  { type: "wall", label: "Wall" },
  { type: "door", label: "Door" },
  { type: "window", label: "Window" },
  { type: "stairs", label: "Stairs" },
  { type: "terrain", label: "Terrain" },
  { type: "obstacle", label: "Obstacle" },
  { type: "spawn_point", label: "Spawn" },
  { type: "secret_area", label: "Secret" },
  { type: "label", label: "Label" },
  { type: "lighting_note", label: "Light Note" }
];

function nextElement(type: MapElement["type"], index: number): MapElement {
  const id = `${type}_${Date.now()}_${index}`;
  if (type === "corridor" || type === "wall") {
    return { id, type, name: tools.find((tool) => tool.type === type)?.label, points: [{ x: 4, y: 4 + index }, { x: 10, y: 4 + index }], visibility: "DM_ONLY", metadata: {} };
  }
  if (type === "door" || type === "window") {
    return { id, type, name: tools.find((tool) => tool.type === type)?.label, bounds: { x: 8, y: 6 + index, width: 1, height: 1 }, orientation: "north", visibility: "DM_ONLY", metadata: {} };
  }
  if (type === "spawn_point" || type === "label" || type === "lighting_note") {
    return { id, type, name: tools.find((tool) => tool.type === type)?.label, position: { x: 6 + index, y: 6 + index }, label: type === "label" ? "Map label" : undefined, note: type === "lighting_note" ? "Describe light level, shadows, or magical illumination." : undefined, visibility: "DM_ONLY", metadata: {} };
  }
  return { id, type, name: tools.find((tool) => tool.type === type)?.label, bounds: { x: 4 + index, y: 4 + index, width: type === "room" ? 6 : 3, height: type === "room" ? 5 : 3 }, terrainType: type === "terrain" ? "rough" : undefined, visibility: "DM_ONLY", metadata: {} };
}

function elementColor(type: MapElement["type"]) {
  const colors: Record<MapElement["type"], string> = {
    room: "#3f3f46",
    corridor: "#71717a",
    wall: "#f3c969",
    door: "#a16207",
    window: "#38bdf8",
    stairs: "#c084fc",
    terrain: "#22c55e",
    obstacle: "#ef4444",
    spawn_point: "#10b981",
    secret_area: "#a855f7",
    label: "#e4e4e7",
    lighting_note: "#facc15"
  };
  return colors[type];
}

function GridCanvas({
  map,
  selectedElementId,
  onSelect
}: {
  map: EditableMap;
  selectedElementId?: string;
  onSelect: (id: string) => void;
}) {
  const cell = 24;
  const width = map.gridWidth * cell;
  const height = map.gridHeight * cell;
  const visibleElements = map.layers.flatMap((layer) => layer.visible ? layer.data.elements : []);
  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = 0; x <= map.gridWidth; x += 1) lines.push(<line key={`x-${x}`} x1={x * cell} y1={0} x2={x * cell} y2={height} />);
    for (let y = 0; y <= map.gridHeight; y += 1) lines.push(<line key={`y-${y}`} x1={0} y1={y * cell} x2={width} y2={y * cell} />);
    return lines;
  }, [height, map.gridHeight, map.gridWidth, width]);

  return (
    <div className="overflow-auto rounded-lg border border-white/10 bg-[#050509]">
      <svg className="min-h-[420px] min-w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${map.name} editable grid`}>
        <rect width={width} height={height} fill="#09090f" />
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">{gridLines}</g>
        {visibleElements.map((element) => {
          const color = elementColor(element.type);
          const selected = selectedElementId === element.id;
          if (element.points?.length) {
            const points = element.points.map((point) => `${point.x * cell},${point.y * cell}`).join(" ");
            return <polyline key={element.id} points={points} fill="none" stroke={color} strokeWidth={selected ? 7 : 4} strokeLinecap="round" onClick={() => onSelect(element.id)} />;
          }
          if (element.position) {
            return (
              <g key={element.id} onClick={() => onSelect(element.id)}>
                <circle cx={element.position.x * cell} cy={element.position.y * cell} r={selected ? 9 : 7} fill={color} />
                {element.label ? <text x={element.position.x * cell + 10} y={element.position.y * cell - 8} fill="#fafafa" fontSize="12">{element.label}</text> : null}
              </g>
            );
          }
          if (element.bounds) {
            return (
              <g key={element.id} onClick={() => onSelect(element.id)}>
                <rect x={element.bounds.x * cell} y={element.bounds.y * cell} width={element.bounds.width * cell} height={element.bounds.height * cell} fill={color} fillOpacity={element.type === "secret_area" ? 0.18 : 0.35} stroke={selected ? "#fff7ed" : color} strokeWidth={selected ? 3 : 2} strokeDasharray={element.secret || element.type === "secret_area" ? "5 4" : undefined} />
                {element.name ? <text x={element.bounds.x * cell + 6} y={element.bounds.y * cell + 16} fill="#fafafa" fontSize="12">{element.name}</text> : null}
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

export function MapBuilderShell({ initialMap, canEdit }: { initialMap: EditableMap; canEdit: boolean }) {
  const router = useRouter();
  const [map, setMap] = useState(initialMap);
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>();
  const [status, setStatus] = useState("");
  const selectedElement = map.layers.flatMap((layer) => layer.data.elements).find((element) => element.id === selectedElementId);

  function updateBaseLayer(updater: (elements: MapElement[]) => MapElement[]) {
    setMap((current) => ({
      ...current,
      sourceType: current.sourceType === "AI_BLUEPRINT" ? "HYBRID" : current.sourceType,
      layers: current.layers.map((layer, index) => index === 0 ? { ...layer, data: { elements: updater(layer.data.elements) } } : layer)
    }));
  }

  function addElement(type: MapElement["type"]) {
    updateBaseLayer((elements) => {
      const element = nextElement(type, elements.length);
      setSelectedElementId(element.id);
      return [...elements, element];
    });
  }

  function removeSelected() {
    if (!selectedElementId) return;
    updateBaseLayer((elements) => elements.filter((element) => element.id !== selectedElementId));
    setSelectedElementId(undefined);
  }

  async function saveMap() {
    setStatus("Saving...");
    const response = await fetch(`/api/maps/${map.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: map.name,
        description: map.description,
        sourceType: map.sourceType,
        gridWidth: map.gridWidth,
        gridHeight: map.gridHeight,
        theme: map.theme,
        environment: map.environment,
        lightingNotes: map.lightingNotes,
        interactiveNotes: map.interactiveNotes,
        editorState: { zoom: 1, pan: { x: 0, y: 0 }, selectedTool: "select", showGrid: true },
        layers: map.layers
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setStatus(body.error || "Could not save map.");
      return;
    }
    setStatus("Saved.");
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <Card className="xl:sticky xl:top-24 xl:self-start">
        <div className="flex flex-wrap gap-2">
          <Badge tone="mana">editable data</Badge>
          <Badge tone="violet">{map.sourceType.replace(/_/g, " ").toLowerCase()}</Badge>
        </div>
        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Map name</label>
        <input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={map.name} disabled={!canEdit} onChange={(event) => setMap({ ...map, name: event.target.value })} />
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</label>
        <textarea className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={map.description ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, description: event.target.value })} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Width<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" type="number" min={5} max={200} disabled={!canEdit} value={map.gridWidth} onChange={(event) => setMap({ ...map, gridWidth: Number(event.target.value) })} /></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Height<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" type="number" min={5} max={200} disabled={!canEdit} value={map.gridHeight} onChange={(event) => setMap({ ...map, gridHeight: Number(event.target.value) })} /></label>
        </div>
        {canEdit ? <button className="mt-5 w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void" onClick={saveMap}>Save map</button> : null}
        {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
      </Card>

      <section className="min-w-0">
        <Card className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Structured map canvas</h2>
              <p className="mt-1 text-sm text-zinc-400">SVG v1 renderer using grid-space rooms, corridors, notes, and terrain.</p>
            </div>
            <Badge tone="gold">{map.gridWidth} x {map.gridHeight} square</Badge>
          </div>
        </Card>
        <GridCanvas map={map} selectedElementId={selectedElementId} onSelect={setSelectedElementId} />
      </section>

      <div className="grid gap-4 xl:sticky xl:top-24 xl:self-start">
        <Card>
          <h2 className="text-xl font-bold text-white">Tools</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {tools.map((tool) => (
              <button key={tool.type} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-semibold text-zinc-100 hover:border-mana/40 hover:bg-mana/10 disabled:opacity-40" disabled={!canEdit} onClick={() => addElement(tool.type)}>
                {tool.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-white">Layers</h2>
          <div className="mt-4 grid gap-2">
            {map.layers.map((layer) => (
              <div key={layer.id ?? layer.order} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="font-semibold text-white">{layer.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{layer.data.elements.length} editable elements</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Inspector</h2>
            {selectedElement ? <button className="rounded-md border border-crimson/40 px-3 py-2 text-sm font-semibold text-crimson" disabled={!canEdit} onClick={removeSelected}>Erase</button> : null}
          </div>
          {selectedElement ? (
            <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-semibold text-white">{selectedElement.name ?? selectedElement.type}</p>
              <p className="mt-1 text-xs text-zinc-400">{selectedElement.type.replace(/_/g, " ")}</p>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(selectedElement, null, 2)}</pre>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-300">Select an element on the canvas or add a new tool element to inspect its editable JSON.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

