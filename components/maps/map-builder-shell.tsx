"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MapElement, MapLayerData } from "@/lib/maps/blueprint-schema";

type Tool =
  | "select"
  | "move"
  | "room"
  | "corridor"
  | "wall"
  | "door"
  | "window"
  | "stairs"
  | "terrain"
  | "obstacle"
  | "spawn_point"
  | "secret_area"
  | "label"
  | "lighting_note"
  | "eraser";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

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

type Snapshot = {
  layers: EditableLayer[];
  sourceType: string;
  editorState: Record<string, unknown>;
};

type DragState =
  | { kind: "move"; ids: string[]; start: GridPoint; originals: MapElement[] }
  | { kind: "resize"; id: string; handle: ResizeHandle; start: GridPoint; original: MapElement }
  | { kind: "draw-room"; start: GridPoint; current: GridPoint }
  | { kind: "draw-wall"; start: GridPoint; current: GridPoint };

type GridPoint = { x: number; y: number };

const cell = 32;
const historyLimit = 50;
const minElementSize = 1;
const defaultLayers = ["Terrain", "Structures", "Objects", "Lighting Notes", "Spawn Points", "DM Notes"];

const buildTools: Array<{ tool: Tool; label: string; shortcut?: string }> = [
  { tool: "select", label: "Select", shortcut: "V" },
  { tool: "room", label: "Room" },
  { tool: "corridor", label: "Corridor" },
  { tool: "wall", label: "Wall" },
  { tool: "door", label: "Door" },
  { tool: "window", label: "Window" },
  { tool: "terrain", label: "Terrain" },
  { tool: "obstacle", label: "Obstacle" },
  { tool: "stairs", label: "Stairs" },
  { tool: "spawn_point", label: "Spawn" },
  { tool: "secret_area", label: "Secret" },
  { tool: "label", label: "Label" },
  { tool: "eraser", label: "Eraser" }
];

const terrainOptions = ["stone", "dirt", "grass", "water", "lava", "wood", "road", "difficult"];
const rotatableTypes = new Set<MapElement["type"]>(["door", "window", "stairs", "obstacle", "terrain", "label"]);

function cloneLayers(layers: EditableLayer[]): EditableLayer[] {
  return JSON.parse(JSON.stringify(layers)) as EditableLayer[];
}

function cloneElement(element: MapElement): MapElement {
  return JSON.parse(JSON.stringify(element)) as MapElement;
}

function normalizeRotation(value: number | undefined) {
  const next = ((value ?? 0) + 360) % 360;
  return Number.isFinite(next) ? next : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointKey(point: GridPoint) {
  return `${point.x},${point.y}`;
}

function makeId(type: MapElement["type"]) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function layerForTool(tool: Tool, layers: EditableLayer[]) {
  const preferred: Record<string, string> = {
    room: "Structures",
    corridor: "Structures",
    wall: "Structures",
    door: "Structures",
    window: "Structures",
    stairs: "Structures",
    terrain: "Terrain",
    obstacle: "Objects",
    spawn_point: "Spawn Points",
    secret_area: "DM Notes",
    label: "DM Notes",
    lighting_note: "Lighting Notes"
  };
  const target = preferred[tool] ?? "Objects";
  return layers.find((layer) => layer.name.toLowerCase() === target.toLowerCase() && !layer.locked) ?? layers.find((layer) => !layer.locked) ?? layers[0];
}

function ensureDefaultLayers(layers: EditableLayer[]) {
  if (layers.length > 1 || layers[0]?.name !== "Base") return layers;
  return defaultLayers.map((name, index) => ({
    id: index === 0 ? layers[0]?.id : undefined,
    name,
    order: index,
    visible: true,
    locked: false,
    data: index === 0 ? layers[0]?.data ?? { elements: [] } : { elements: [] }
  }));
}

function elementBounds(element: MapElement) {
  if (element.bounds) return element.bounds;
  if (element.position) return { x: element.position.x - 0.5, y: element.position.y - 0.5, width: 1, height: 1 };
  if (element.points?.length) {
    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) };
  }
  return null;
}

function createElement(type: MapElement["type"], point: GridPoint, extras: Partial<MapElement> = {}): MapElement {
  const id = makeId(type);
  const base = { id, type, name: type.replace(/_/g, " "), visibility: "DM_ONLY" as const, metadata: {}, ...extras };
  if (type === "corridor" || type === "wall") {
    return { ...base, points: [point, { x: point.x + 4, y: point.y }] };
  }
  if (type === "spawn_point" || type === "label" || type === "lighting_note") {
    return {
      ...base,
      position: point,
      label: type === "label" ? "Map label" : type === "spawn_point" ? "Spawn" : undefined,
      note: type === "lighting_note" ? "Describe light level, shadows, or magical illumination." : undefined
    };
  }
  if (type === "door" || type === "window") {
    return { ...base, bounds: { x: point.x, y: point.y, width: 1, height: 1 }, orientation: "north", rotation: 0, blocksMovement: type === "door", blocksVision: type === "door" };
  }
  return {
    ...base,
    bounds: { x: point.x, y: point.y, width: type === "room" ? 6 : 3, height: type === "room" ? 5 : 3 },
    terrainType: type === "room" ? "stone" : type === "terrain" ? "grass" : undefined,
    secret: type === "secret_area" ? true : undefined,
    blocksMovement: type === "obstacle" ? true : undefined,
    blocksVision: type === "secret_area" ? true : undefined
  };
}

function moveElement(element: MapElement, delta: GridPoint, gridWidth: number, gridHeight: number): MapElement {
  const next = cloneElement(element);
  if (next.bounds) {
    next.bounds.x = clamp(next.bounds.x + delta.x, 0, gridWidth - next.bounds.width);
    next.bounds.y = clamp(next.bounds.y + delta.y, 0, gridHeight - next.bounds.height);
  }
  if (next.position) {
    next.position.x = clamp(next.position.x + delta.x, 0, gridWidth);
    next.position.y = clamp(next.position.y + delta.y, 0, gridHeight);
  }
  if (next.points?.length) {
    next.points = next.points.map((point) => ({
      x: clamp(point.x + delta.x, 0, gridWidth),
      y: clamp(point.y + delta.y, 0, gridHeight)
    }));
  }
  return next;
}

function resizeElement(element: MapElement, handle: ResizeHandle, delta: GridPoint, gridWidth: number, gridHeight: number): MapElement {
  const next = cloneElement(element);
  if (!next.bounds) return next;
  const bounds = { ...next.bounds };
  if (handle.includes("w")) {
    const newX = clamp(bounds.x + delta.x, 0, bounds.x + bounds.width - minElementSize);
    bounds.width += bounds.x - newX;
    bounds.x = newX;
  }
  if (handle.includes("e")) bounds.width = clamp(bounds.width + delta.x, minElementSize, gridWidth - bounds.x);
  if (handle.includes("n")) {
    const newY = clamp(bounds.y + delta.y, 0, bounds.y + bounds.height - minElementSize);
    bounds.height += bounds.y - newY;
    bounds.y = newY;
  }
  if (handle.includes("s")) bounds.height = clamp(bounds.height + delta.y, minElementSize, gridHeight - bounds.y);
  next.bounds = bounds;
  return next;
}

function styleForElement(element: MapElement) {
  const terrain = element.terrainType ?? (element.type === "room" ? "stone" : "");
  if (element.type === "wall") return { fill: "none", stroke: "#d6b25e", opacity: 1, pattern: "" };
  if (element.type === "door") return { fill: "#8b5a2b", stroke: "#f3c969", opacity: 0.9, pattern: "" };
  if (element.type === "window") return { fill: "#67e8f9", stroke: "#bae6fd", opacity: 0.75, pattern: "" };
  if (element.type === "stairs") return { fill: "#7c3aed", stroke: "#c4b5fd", opacity: 0.55, pattern: "url(#stairsPattern)" };
  if (element.type === "secret_area") return { fill: "#9333ea", stroke: "#d8b4fe", opacity: 0.18, pattern: "" };
  if (element.type === "obstacle") return { fill: "#78350f", stroke: "#f59e0b", opacity: 0.65, pattern: "url(#woodPattern)" };
  if (element.type === "spawn_point") return { fill: "#10b981", stroke: "#bbf7d0", opacity: 0.95, pattern: "" };
  if (element.type === "lighting_note") return { fill: "#facc15", stroke: "#fde68a", opacity: 0.9, pattern: "" };
  if (terrain === "water") return { fill: "#0284c7", stroke: "#7dd3fc", opacity: 0.55, pattern: "url(#waterPattern)" };
  if (terrain === "lava") return { fill: "#dc2626", stroke: "#fdba74", opacity: 0.68, pattern: "url(#lavaPattern)" };
  if (terrain === "grass") return { fill: "#166534", stroke: "#86efac", opacity: 0.5, pattern: "url(#grassPattern)" };
  if (terrain === "dirt") return { fill: "#854d0e", stroke: "#d6a45c", opacity: 0.5, pattern: "url(#dirtPattern)" };
  if (terrain === "wood") return { fill: "#713f12", stroke: "#facc15", opacity: 0.45, pattern: "url(#woodPattern)" };
  if (terrain === "road") return { fill: "#52525b", stroke: "#a1a1aa", opacity: 0.46, pattern: "url(#roadPattern)" };
  if (terrain === "difficult") return { fill: "#701a75", stroke: "#f0abfc", opacity: 0.32, pattern: "url(#difficultPattern)" };
  return { fill: "#3f3f46", stroke: "#a1a1aa", opacity: 0.42, pattern: "url(#stonePattern)" };
}

export function MapBuilderShell({ initialMap, canEdit }: { initialMap: EditableMap; canEdit: boolean }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [map, setMap] = useState<EditableMap>({ ...initialMap, layers: ensureDefaultLayers(initialMap.layers) });
  const initialEditorState = initialMap.editorState ?? {};
  const [activeTool, setActiveTool] = useState<Tool>((initialEditorState.selectedTool as Tool) || "select");
  const [activeLayerKey, setActiveLayerKey] = useState(map.layers[0]?.id ?? String(map.layers[0]?.order ?? 0));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [corridorStart, setCorridorStart] = useState<GridPoint | null>(null);
  const [zoom, setZoom] = useState(typeof initialEditorState.zoom === "number" ? initialEditorState.zoom : 1);
  const [pan, setPan] = useState<GridPoint>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(initialEditorState.showGrid !== false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [status, setStatus] = useState("");

  const width = map.gridWidth * cell;
  const height = map.gridHeight * cell;
  const activeLayer = map.layers.find((layer) => (layer.id ?? String(layer.order)) === activeLayerKey) ?? map.layers[0];
  const selectedElements = map.layers.flatMap((layer) => layer.data.elements).filter((element) => selectedIds.includes(element.id));
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const activeLayerLocked = !activeLayer || activeLayer.locked;

  const viewBox = useMemo(() => {
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    return `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`;
  }, [height, pan.x, pan.y, width, zoom]);

  const orderedLayers = useMemo(() => [...map.layers].sort((a, b) => a.order - b.order), [map.layers]);

  function snapshot(): Snapshot {
    return {
      layers: cloneLayers(map.layers),
      sourceType: map.sourceType,
      editorState: { zoom, pan, selectedTool: activeTool, showGrid }
    };
  }

  function pushHistory() {
    setUndoStack((stack) => [...stack.slice(-historyLimit + 1), snapshot()]);
    setRedoStack([]);
  }

  const updateLayers = useCallback((updater: (layers: EditableLayer[]) => EditableLayer[], withHistory = true) => {
    if (withHistory) {
      setUndoStack((stack) => [...stack.slice(-historyLimit + 1), {
        layers: cloneLayers(map.layers),
        sourceType: map.sourceType,
        editorState: { zoom, pan, selectedTool: activeTool, showGrid }
      }]);
      setRedoStack([]);
    }
    setMap((current) => ({
      ...current,
      sourceType: current.sourceType === "AI_BLUEPRINT" ? "HYBRID" : current.sourceType,
      layers: updater(cloneLayers(current.layers)).map((layer, index) => ({ ...layer, order: index }))
    }));
  }, [activeTool, map.layers, map.sourceType, pan, showGrid, zoom]);

  function clientToGrid(event: React.PointerEvent<SVGSVGElement> | React.WheelEvent<SVGSVGElement>): GridPoint {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    const svgX = pan.x + ((event.clientX - rect.left) / rect.width) * viewWidth;
    const svgY = pan.y + ((event.clientY - rect.top) / rect.height) * viewHeight;
    return {
      x: clamp(Math.round(svgX / cell), 0, map.gridWidth),
      y: clamp(Math.round(svgY / cell), 0, map.gridHeight)
    };
  }

  function updateElements(ids: string[], transform: (element: MapElement) => MapElement, withHistory = true) {
    updateLayers((layers) => layers.map((layer) => ({
      ...layer,
      data: {
        elements: layer.data.elements.map((element) => ids.includes(element.id) ? transform(element) : element)
      }
    })), withHistory);
  }

  function addElementToLayer(element: MapElement, layerKey = activeLayerKey) {
    const targetLayer = map.layers.find((layer) => (layer.id ?? String(layer.order)) === layerKey) ?? layerForTool(element.type as Tool, map.layers);
    if (!targetLayer || targetLayer.locked) return;
    updateLayers((layers) => layers.map((layer) => (layer.id ?? String(layer.order)) === (targetLayer.id ?? String(targetLayer.order))
      ? { ...layer, data: { elements: [...layer.data.elements, element] } }
      : layer
    ));
    setSelectedIds([element.id]);
  }

  function selectElement(id: string, append: boolean) {
    setSelectedIds((current) => append ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]);
  }

  function deleteSelected() {
    if (!selectedIds.length || !canEdit) return;
    updateLayers((layers) => layers.map((layer) => ({ ...layer, data: { elements: layer.data.elements.filter((element) => !selectedIds.includes(element.id)) } })));
    setSelectedIds([]);
  }

  function duplicateSelected() {
    if (!selectedIds.length || !canEdit) return;
    const copyBySourceId = new Map(selectedElements.map((element) => {
      const copy = moveElement({ ...cloneElement(element), id: makeId(element.type), name: `${element.name ?? element.type} copy` }, { x: 1, y: 1 }, map.gridWidth, map.gridHeight);
      return [element.id, copy] as const;
    }));
    updateLayers((layers) => layers.map((layer) => ({
      ...layer,
      data: { elements: [...layer.data.elements, ...layer.data.elements.map((element) => copyBySourceId.get(element.id)).filter((copy): copy is MapElement => Boolean(copy))] }
    })));
    setSelectedIds([...copyBySourceId.values()].map((copy) => copy.id));
  }

  function rotateSelected() {
    if (!selectedIds.length || !canEdit) return;
    updateElements(selectedIds, (element) => rotatableTypes.has(element.type) ? { ...element, rotation: normalizeRotation((element.rotation ?? 0) + 90) } : element);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((stack) => [...stack.slice(-historyLimit + 1), snapshot()]);
    setUndoStack((stack) => stack.slice(0, -1));
    setMap((current) => ({ ...current, layers: cloneLayers(previous.layers), sourceType: previous.sourceType }));
    setZoom(typeof previous.editorState.zoom === "number" ? previous.editorState.zoom : zoom);
    setPan((previous.editorState.pan as GridPoint) ?? pan);
    setShowGrid(previous.editorState.showGrid !== false);
    setSelectedIds([]);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack.slice(-historyLimit + 1), snapshot()]);
    setRedoStack((stack) => stack.slice(0, -1));
    setMap((current) => ({ ...current, layers: cloneLayers(next.layers), sourceType: next.sourceType }));
    setZoom(typeof next.editorState.zoom === "number" ? next.editorState.zoom : zoom);
    setPan((next.editorState.pan as GridPoint) ?? pan);
    setShowGrid(next.editorState.showGrid !== false);
    setSelectedIds([]);
  }

  function pointerDownCanvas(event: React.PointerEvent<SVGSVGElement>) {
    if (!canEdit || event.button === 1 || event.altKey) return;
    const point = clientToGrid(event);
    if (activeTool === "room") {
      pushHistory();
      setDrag({ kind: "draw-room", start: point, current: point });
      return;
    }
    if (activeTool === "wall") {
      pushHistory();
      setDrag({ kind: "draw-wall", start: point, current: point });
      return;
    }
    if (activeTool === "corridor") {
      if (!corridorStart) {
        setCorridorStart(point);
        setStatus("Choose corridor end point.");
      } else {
        addElementToLayer({ id: makeId("corridor"), type: "corridor", name: "corridor", points: [corridorStart, point], visibility: "DM_ONLY", metadata: {} });
        setCorridorStart(null);
        setStatus("");
      }
      return;
    }
    if (activeTool !== "select" && activeTool !== "move" && activeTool !== "eraser") {
      addElementToLayer(createElement(activeTool as MapElement["type"], point));
      return;
    }
    setSelectedIds([]);
  }

  function pointerDownElement(event: React.PointerEvent<SVGGElement>, element: MapElement) {
    event.stopPropagation();
    if (!canEdit) {
      selectElement(element.id, event.shiftKey);
      return;
    }
    if (activeTool === "eraser") {
      updateLayers((layers) => layers.map((layer) => ({ ...layer, data: { elements: layer.data.elements.filter((item) => item.id !== element.id) } })));
      setSelectedIds((ids) => ids.filter((id) => id !== element.id));
      return;
    }
    selectElement(element.id, event.shiftKey);
    if (activeTool === "select" || activeTool === "move") {
      pushHistory();
      const ids = event.shiftKey ? [...new Set([...selectedIds, element.id])] : selectedIds.includes(element.id) ? selectedIds : [element.id];
      const originals = map.layers.flatMap((layer) => layer.data.elements).filter((item) => ids.includes(item.id)).map(cloneElement);
      setDrag({ kind: "move", ids, start: clientToGrid(event as unknown as React.PointerEvent<SVGSVGElement>), originals });
    }
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const point = clientToGrid(event);
    if (drag.kind === "draw-room" || drag.kind === "draw-wall") {
      setDrag({ ...drag, current: point });
      return;
    }
    if (drag.kind === "move") {
      const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      updateLayers((layers) => layers.map((layer) => ({
        ...layer,
        data: {
          elements: layer.data.elements.map((element) => {
            const original = drag.originals.find((item) => item.id === element.id);
            return original ? moveElement(original, delta, map.gridWidth, map.gridHeight) : element;
          })
        }
      })), false);
    }
    if (drag.kind === "resize") {
      const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      updateElements([drag.id], () => resizeElement(drag.original, drag.handle, delta, map.gridWidth, map.gridHeight), false);
    }
  }

  function pointerUp() {
    if (!drag) return;
    if (drag.kind === "draw-room") {
      const x = Math.min(drag.start.x, drag.current.x);
      const y = Math.min(drag.start.y, drag.current.y);
      const widthValue = Math.max(minElementSize, Math.abs(drag.current.x - drag.start.x));
      const heightValue = Math.max(minElementSize, Math.abs(drag.current.y - drag.start.y));
      const element = createElement("room", { x, y }, { bounds: { x, y, width: widthValue, height: heightValue }, terrainType: "stone", name: "room" });
      addElementToLayer(element, activeLayerKey);
    }
    if (drag.kind === "draw-wall") {
      addElementToLayer({ id: makeId("wall"), type: "wall", name: "wall", points: [drag.start, drag.current], visibility: "DM_ONLY", metadata: {}, blocksMovement: true, blocksVision: true }, activeLayerKey);
    }
    setDrag(null);
  }

  function pointerDownResize(event: React.PointerEvent<SVGRectElement>, element: MapElement, handle: ResizeHandle) {
    event.stopPropagation();
    if (!canEdit || !element.bounds) return;
    pushHistory();
    setDrag({ kind: "resize", id: element.id, handle, start: clientToGrid(event as unknown as React.PointerEvent<SVGSVGElement>), original: cloneElement(element) });
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom((current) => clamp(Number((current * factor).toFixed(2)), 0.35, 3));
  }

  function nudge(delta: GridPoint) {
    if (!selectedIds.length || !canEdit) return;
    updateElements(selectedIds, (element) => moveElement(element, delta, map.gridWidth, map.gridHeight));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
      if (event.key.toLowerCase() === "d" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        duplicateSelected();
      }
      if (event.key.toLowerCase() === "r") rotateSelected();
      if (event.key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
      if (event.key.toLowerCase() === "y" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        redo();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudge({ x: 0, y: -1 });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudge({ x: 0, y: 1 });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudge({ x: -1, y: 0 });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudge({ x: 1, y: 0 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function updateSelected(updater: (element: MapElement) => MapElement) {
    if (!selectedElement) return;
    updateElements([selectedElement.id], updater);
  }

  function changeLayer(index: number, changes: Partial<EditableLayer>) {
    updateLayers((layers) => layers.map((layer, layerIndex) => layerIndex === index ? { ...layer, ...changes } : layer));
  }

  function moveLayer(index: number, direction: -1 | 1) {
    updateLayers((layers) => {
      const target = index + direction;
      if (target < 0 || target >= layers.length) return layers;
      const next = [...layers];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addLayer() {
    updateLayers((layers) => [...layers, { name: `Layer ${layers.length + 1}`, order: layers.length, visible: true, locked: false, data: { elements: [] } }]);
  }

  function deleteLayer(index: number) {
    if (map.layers.length <= 1) return;
    updateLayers((layers) => layers.filter((_, layerIndex) => layerIndex !== index));
    setSelectedIds([]);
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
        editorState: { zoom, pan, selectedTool: activeTool, showGrid },
        layers: map.layers.map((layer, index) => ({ ...layer, order: index }))
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error || "Could not save map.");
      return;
    }
    setStatus("Saved.");
    router.refresh();
  }

  function renderGridLines() {
    const lines = [];
    for (let x = 0; x <= map.gridWidth; x += 1) lines.push(<line key={`x-${x}`} x1={x * cell} y1={0} x2={x * cell} y2={height} />);
    for (let y = 0; y <= map.gridHeight; y += 1) lines.push(<line key={`y-${y}`} x1={0} y1={y * cell} x2={width} y2={y * cell} />);
    return lines;
  }

  function renderElement(element: MapElement, layer: EditableLayer) {
    const selected = selectedIds.includes(element.id);
    const style = styleForElement(element);
    const common = {
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => pointerDownElement(event, element),
      className: layer.locked ? "cursor-not-allowed" : "cursor-move"
    };
    const rotation = normalizeRotation(element.rotation);
    const bounds = elementBounds(element);
    const transform = bounds && rotation ? `rotate(${rotation} ${(bounds.x + bounds.width / 2) * cell} ${(bounds.y + bounds.height / 2) * cell})` : undefined;

    if (element.points?.length) {
      const points = element.points.map((point) => `${point.x * cell},${point.y * cell}`).join(" ");
      return (
        <g key={element.id} {...common}>
          <polyline points={points} fill="none" stroke={selected ? "#fff7ed" : style.stroke} strokeWidth={selected ? 8 : element.type === "wall" ? 6 : 5} strokeLinecap="round" strokeLinejoin="round" opacity={style.opacity} />
          {selected ? <polyline points={points} fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" /> : null}
        </g>
      );
    }
    if (element.position) {
      return (
        <g key={element.id} {...common}>
          <circle cx={element.position.x * cell} cy={element.position.y * cell} r={selected ? 11 : 8} fill={style.fill} stroke={selected ? "#fff7ed" : style.stroke} strokeWidth={selected ? 3 : 2} opacity={style.opacity} />
          <text x={element.position.x * cell + 12} y={element.position.y * cell - 8} fill="#fafafa" fontSize="13" paintOrder="stroke" stroke="#050509" strokeWidth="3">
            {element.label || element.name || element.type.replace(/_/g, " ")}
          </text>
        </g>
      );
    }
    if (!element.bounds) return null;
    const rect = (
      <rect
        x={element.bounds.x * cell}
        y={element.bounds.y * cell}
        width={element.bounds.width * cell}
        height={element.bounds.height * cell}
        rx={element.type === "door" || element.type === "window" ? 3 : 0}
        fill={style.pattern || style.fill}
        stroke={selected ? "#fff7ed" : style.stroke}
        strokeWidth={selected ? 3 : element.type === "room" ? 2 : 1.5}
        strokeDasharray={element.secret || element.type === "secret_area" ? "7 5" : undefined}
        opacity={style.opacity}
      />
    );
    return (
      <g key={element.id} {...common} transform={transform}>
        {rect}
        {element.type === "stairs" ? (
          <g stroke="#ddd6fe" strokeWidth="1.5" opacity="0.8">
            {Array.from({ length: Math.max(2, Math.floor(element.bounds.height)) }).map((_, index) => (
              <line key={index} x1={element.bounds!.x * cell + 5} y1={(element.bounds!.y + index + 0.5) * cell} x2={(element.bounds!.x + element.bounds!.width) * cell - 5} y2={(element.bounds!.y + index + 0.5) * cell} />
            ))}
          </g>
        ) : null}
        {element.name && element.bounds.width >= 2 && element.bounds.height >= 1.5 ? (
          <text x={element.bounds.x * cell + 8} y={element.bounds.y * cell + 18} fill="#fafafa" fontSize="12" paintOrder="stroke" stroke="#050509" strokeWidth="3">{element.name}</text>
        ) : null}
        {selected && element.bounds ? renderResizeHandles(element) : null}
      </g>
    );
  }

  function renderResizeHandles(element: MapElement) {
    if (!element.bounds || !canEdit) return null;
    const b = element.bounds;
    const handles: Array<[ResizeHandle, number, number]> = [
      ["nw", b.x, b.y], ["n", b.x + b.width / 2, b.y], ["ne", b.x + b.width, b.y],
      ["e", b.x + b.width, b.y + b.height / 2], ["se", b.x + b.width, b.y + b.height],
      ["s", b.x + b.width / 2, b.y + b.height], ["sw", b.x, b.y + b.height], ["w", b.x, b.y + b.height / 2]
    ];
    return handles.map(([handle, x, y]) => (
      <rect
        key={handle}
        x={x * cell - 5}
        y={y * cell - 5}
        width="10"
        height="10"
        fill="#fff7ed"
        stroke="#111827"
        strokeWidth="1"
        className="cursor-nwse-resize"
        onPointerDown={(event) => pointerDownResize(event, element, handle)}
      />
    ));
  }

  const drawPreview = drag?.kind === "draw-room" || drag?.kind === "draw-wall" ? drag : null;

  return (
    <div className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100 md:hidden">
        Map editing works best on a larger screen. Mobile supports review and light edits, but precision building is designed for tablet and desktop.
      </div>

      <div className="grid gap-4 2xl:sticky 2xl:top-24 2xl:self-start">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="mana">Phase 2 editor</Badge>
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
          <button className="mt-5 w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-50" disabled={!canEdit} onClick={saveMap}>Save map</button>
          {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-white">Build tools</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {buildTools.map((tool) => (
              <button key={tool.tool} className={`rounded-md border px-3 py-3 text-sm font-semibold transition ${activeTool === tool.tool ? "border-aureate/50 bg-aureate/15 text-aureate" : "border-white/10 bg-white/[0.03] text-zinc-100 hover:border-mana/40 hover:bg-mana/10"}`} disabled={!canEdit} onClick={() => setActiveTool(tool.tool)}>
                {tool.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40" disabled={!canEdit || !selectedIds.length} onClick={duplicateSelected}>Duplicate</button>
            <button className="rounded-md border border-crimson/30 px-3 py-2 text-sm text-crimson disabled:opacity-40" disabled={!canEdit || !selectedIds.length} onClick={deleteSelected}>Delete</button>
            <button className="rounded-md border border-violet/30 px-3 py-2 text-sm text-violet disabled:opacity-40" disabled={!canEdit || !selectedIds.length} onClick={rotateSelected}>Rotate</button>
            <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-100" onClick={() => setShowGrid((value) => !value)}>Grid {showGrid ? "On" : "Off"}</button>
            <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40" disabled={!undoStack.length} onClick={undo}>Undo</button>
            <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40" disabled={!redoStack.length} onClick={redo}>Redo</button>
          </div>
        </Card>
      </div>

      <section className="min-w-0">
        <Card className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Tactical map canvas</h2>
              <p className="mt-1 text-sm text-zinc-400">Drag rooms to draw, click objects to select, Shift+Click multi-select, arrow keys nudge, R rotates, wheel zooms.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white" onClick={() => setZoom((value) => clamp(value * 1.15, 0.35, 3))}>Zoom In</button>
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white" onClick={() => setZoom((value) => clamp(value * 0.85, 0.35, 3))}>Zoom Out</button>
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-white" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
            </div>
          </div>
        </Card>
        <div className="overflow-auto rounded-lg border border-white/10 bg-[#050509] shadow-inner shadow-black">
          <svg
            ref={svgRef}
            className="min-h-[620px] min-w-full touch-none"
            viewBox={viewBox}
            role="img"
            aria-label={`${map.name} editable grid`}
            onPointerDown={pointerDownCanvas}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerLeave={pointerUp}
            onWheel={onWheel}
          >
            <defs>
              <pattern id="stonePattern" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#3f3f46" /><path d="M0 14H28M14 0V28" stroke="#52525b" strokeWidth="1" /></pattern>
              <pattern id="grassPattern" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#166534" /><path d="M2 14L8 4M10 16L16 5" stroke="#22c55e" strokeWidth="1.2" /></pattern>
              <pattern id="waterPattern" width="30" height="14" patternUnits="userSpaceOnUse"><rect width="30" height="14" fill="#0369a1" /><path d="M0 7C8 1 14 13 22 7S30 7 30 7" fill="none" stroke="#7dd3fc" strokeWidth="1.4" /></pattern>
              <pattern id="lavaPattern" width="28" height="18" patternUnits="userSpaceOnUse"><rect width="28" height="18" fill="#991b1b" /><path d="M0 14C7 2 14 20 28 4" fill="none" stroke="#fb923c" strokeWidth="2" /></pattern>
              <pattern id="dirtPattern" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#713f12" /><circle cx="4" cy="7" r="1.3" fill="#a16207" /><circle cx="13" cy="14" r="1.5" fill="#92400e" /></pattern>
              <pattern id="woodPattern" width="26" height="16" patternUnits="userSpaceOnUse"><rect width="26" height="16" fill="#713f12" /><path d="M0 4H26M0 12H26" stroke="#a16207" strokeWidth="1" /></pattern>
              <pattern id="roadPattern" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#52525b" /><path d="M4 4H12V12H4zM18 16H27V25H18z" fill="#71717a" /></pattern>
              <pattern id="difficultPattern" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#701a75" /><path d="M3 18L18 3M6 3L19 16" stroke="#f0abfc" strokeWidth="1.2" /></pattern>
              <pattern id="stairsPattern" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#5b21b6" /><path d="M3 6H21M3 12H21M3 18H21" stroke="#ddd6fe" strokeWidth="1.5" /></pattern>
            </defs>
            <rect width={width} height={height} fill="#09090f" />
            {showGrid ? <g stroke="rgba(255,255,255,0.09)" strokeWidth="1">{renderGridLines()}</g> : null}
            {orderedLayers.filter((layer) => layer.visible).map((layer) => (
              <g key={layer.id ?? layer.order} opacity={layer.locked ? 0.55 : 1}>
                {layer.data.elements.map((element) => renderElement(element, layer))}
              </g>
            ))}
            {drawPreview?.kind === "draw-room" ? (
              <rect
                x={Math.min(drawPreview.start.x, drawPreview.current.x) * cell}
                y={Math.min(drawPreview.start.y, drawPreview.current.y) * cell}
                width={Math.max(1, Math.abs(drawPreview.current.x - drawPreview.start.x)) * cell}
                height={Math.max(1, Math.abs(drawPreview.current.y - drawPreview.start.y)) * cell}
                fill="url(#stonePattern)"
                stroke="#fff7ed"
                strokeWidth="3"
                strokeDasharray="6 4"
                opacity="0.55"
              />
            ) : null}
            {drawPreview?.kind === "draw-wall" ? (
              <line x1={drawPreview.start.x * cell} y1={drawPreview.start.y * cell} x2={drawPreview.current.x * cell} y2={drawPreview.current.y * cell} stroke="#fff7ed" strokeWidth="6" strokeDasharray="6 4" />
            ) : null}
            {corridorStart ? <circle cx={corridorStart.x * cell} cy={corridorStart.y * cell} r="8" fill="#fff7ed" /> : null}
          </svg>
        </div>
      </section>

      <div className="grid gap-4 2xl:sticky 2xl:top-24 2xl:self-start">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Layers</h2>
            <button className="rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana disabled:opacity-40" disabled={!canEdit} onClick={addLayer}>Add</button>
          </div>
          <div className="mt-4 grid gap-2">
            {map.layers.map((layer, index) => {
              const key = layer.id ?? String(layer.order);
              return (
                <div key={key} className={`rounded-md border p-3 ${activeLayerKey === key ? "border-aureate/35 bg-aureate/10" : "border-white/10 bg-black/20"}`}>
                  <input className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm font-semibold text-white" value={layer.name} disabled={!canEdit} onFocus={() => setActiveLayerKey(key)} onChange={(event) => changeLayer(index, { name: event.target.value })} />
                  <p className="mt-1 text-xs text-zinc-400">{layer.data.elements.length} elements</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-200" onClick={() => setActiveLayerKey(key)}>Active</button>
                    <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-200" disabled={!canEdit} onClick={() => changeLayer(index, { visible: !layer.visible })}>{layer.visible ? "Hide" : "Show"}</button>
                    <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-200" disabled={!canEdit} onClick={() => changeLayer(index, { locked: !layer.locked })}>{layer.locked ? "Unlock" : "Lock"}</button>
                    <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-200" disabled={!canEdit || index === 0} onClick={() => moveLayer(index, -1)}>Up</button>
                    <button className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-200" disabled={!canEdit || index === map.layers.length - 1} onClick={() => moveLayer(index, 1)}>Down</button>
                    <button className="rounded border border-crimson/30 px-2 py-1 text-xs text-crimson" disabled={!canEdit || map.layers.length <= 1} onClick={() => deleteLayer(index)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-white">Properties</h2>
          {selectedElement ? (
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={selectedElement.name ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, name: event.target.value }))} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Type<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={selectedElement.type.replace(/_/g, " ")} disabled /></label>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rotation<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" type="number" value={selectedElement.rotation ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, rotation: Number(event.target.value) }))} /></label>
              </div>
              {selectedElement.bounds ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height"] as const).map((field) => (
                    <label key={field} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{field}<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" type="number" value={selectedElement.bounds?.[field] ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, bounds: { ...element.bounds!, [field]: Number(event.target.value) } }))} /></label>
                  ))}
                </div>
              ) : null}
              {selectedElement.position ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y"] as const).map((field) => (
                    <label key={field} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{field}<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" type="number" value={selectedElement.position?.[field] ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, position: { ...element.position!, [field]: Number(event.target.value) } }))} /></label>
                  ))}
                </div>
              ) : null}
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Terrain<select className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={selectedElement.terrainType ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, terrainType: event.target.value || undefined }))}><option value="">None</option>{terrainOptions.map((terrain) => <option key={terrain} value={terrain}>{terrain}</option>)}</select></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Label<input className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={selectedElement.label ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, label: event.target.value }))} /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">DM notes<textarea className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white" value={selectedElement.note ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, note: event.target.value }))} /></label>
              <div className="grid gap-2 text-sm text-zinc-200">
                {[
                  ["Secret", "secret"],
                  ["Blocks movement", "blocksMovement"],
                  ["Blocks vision", "blocksVision"],
                  ["Locked", "locked"]
                ].map(([label, field]) => (
                  <label key={field} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 p-2">
                    <input type="checkbox" checked={Boolean(selectedElement[field as keyof MapElement])} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, [field]: event.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-300">Select an element to edit position, size, rotation, terrain, visibility, blocking, and DM notes.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
