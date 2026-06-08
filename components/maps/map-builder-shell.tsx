"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapElement, MapLayerData } from "@/lib/maps/blueprint-schema";

type Tool =
  | "select"
  | "pan"
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
type GridPoint = { x: number; y: number };
type ClientPoint = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };

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

type Interaction =
  | {
      kind: "move";
      ids: string[];
      pointerId: number;
      startClient: ClientPoint;
      startGrid: GridPoint;
      originals: MapElement[];
      started: boolean;
    }
  | {
      kind: "resize";
      id: string;
      handle: ResizeHandle;
      pointerId: number;
      startClient: ClientPoint;
      startGrid: GridPoint;
      original: MapElement;
      started: boolean;
    }
  | { kind: "draw-room"; pointerId: number; start: GridPoint; current: GridPoint }
  | { kind: "draw-wall"; pointerId: number; start: GridPoint; current: GridPoint }
  | { kind: "marquee"; pointerId: number; start: GridPoint; current: GridPoint; append: boolean }
  | { kind: "pan"; pointerId: number; startClient: ClientPoint; originalPan: GridPoint };

const cell = 32;
const minElementSize = 1;
const historyLimit = 50;
const dragThresholdPx = 3;
const defaultLayers = ["Terrain", "Structures", "Objects", "Lighting Notes", "Spawn Points", "DM Notes"];

const buildTools: Array<{ tool: Tool; label: string; shortcut?: string }> = [
  { tool: "select", label: "Select", shortcut: "V" },
  { tool: "pan", label: "Hand", shortcut: "Space" },
  { tool: "room", label: "Room" },
  { tool: "corridor", label: "Corridor" },
  { tool: "wall", label: "Wall" },
  { tool: "door", label: "Door" },
  { tool: "window", label: "Window" },
  { tool: "terrain", label: "Terrain" },
  { tool: "obstacle", label: "Object" },
  { tool: "stairs", label: "Stairs" },
  { tool: "spawn_point", label: "Spawn" },
  { tool: "secret_area", label: "Secret" },
  { tool: "label", label: "Label" },
  { tool: "eraser", label: "Erase" }
];

const terrainOptions = ["stone", "dirt", "grass", "water", "lava", "wood", "road", "difficult"];
const rotatableTypes = new Set<MapElement["type"]>(["door", "window", "stairs", "obstacle", "terrain", "label"]);

function cloneLayers(layers: EditableLayer[]): EditableLayer[] {
  return JSON.parse(JSON.stringify(layers)) as EditableLayer[];
}

function cloneElement(element: MapElement): MapElement {
  return JSON.parse(JSON.stringify(element)) as MapElement;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRotation(value: number | undefined) {
  const next = ((value ?? 0) + 360) % 360;
  return Number.isFinite(next) ? next : 0;
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function makeId(type: MapElement["type"]) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function layerKey(layer: EditableLayer) {
  return layer.id ?? String(layer.order);
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

function layerForTool(tool: Tool, layers: EditableLayer[]) {
  const preferred: Partial<Record<Tool, string>> = {
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

function elementBounds(element: MapElement): Bounds | null {
  if (element.bounds) return element.bounds;
  if (element.position) return { x: element.position.x - 0.5, y: element.position.y - 0.5, width: 1, height: 1 };
  if (element.points?.length) {
    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(1, Math.max(...xs) - minX),
      height: Math.max(1, Math.max(...ys) - minY)
    };
  }
  return null;
}

function boundsIntersect(a: Bounds, b: Bounds) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

function createElement(type: MapElement["type"], point: GridPoint, extras: Partial<MapElement> = {}): MapElement {
  const base = { id: makeId(type), type, name: type.replace(/_/g, " "), visibility: "DM_ONLY" as const, metadata: {}, ...extras };
  if (type === "corridor" || type === "wall") {
    return { ...base, points: [point, { x: point.x + 4, y: point.y }], blocksMovement: type === "wall", blocksVision: type === "wall" };
  }
  if (type === "spawn_point" || type === "label" || type === "lighting_note") {
    return {
      ...base,
      position: point,
      label: type === "label" ? "Map label" : type === "spawn_point" ? "Spawn" : undefined,
      note: type === "lighting_note" ? "Describe light, shadows, or magical illumination." : undefined
    };
  }
  if (type === "door" || type === "window") {
    return {
      ...base,
      bounds: { x: point.x, y: point.y, width: 1, height: 1 },
      orientation: "north",
      rotation: 0,
      blocksMovement: type === "door",
      blocksVision: type === "door"
    };
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
    next.bounds.x = clamp(next.bounds.x + delta.x, 0, Math.max(0, gridWidth - next.bounds.width));
    next.bounds.y = clamp(next.bounds.y + delta.y, 0, Math.max(0, gridHeight - next.bounds.height));
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
  if (element.type === "door") return { fill: "#8b5a2b", stroke: "#f3c969", opacity: 0.95, pattern: "" };
  if (element.type === "window") return { fill: "#67e8f9", stroke: "#bae6fd", opacity: 0.8, pattern: "" };
  if (element.type === "stairs") return { fill: "#7c3aed", stroke: "#c4b5fd", opacity: 0.62, pattern: "url(#stairsPattern)" };
  if (element.type === "secret_area") return { fill: "#9333ea", stroke: "#d8b4fe", opacity: 0.22, pattern: "" };
  if (element.type === "obstacle") return { fill: "#78350f", stroke: "#f59e0b", opacity: 0.68, pattern: "url(#woodPattern)" };
  if (element.type === "spawn_point") return { fill: "#10b981", stroke: "#bbf7d0", opacity: 0.98, pattern: "" };
  if (element.type === "lighting_note") return { fill: "#facc15", stroke: "#fde68a", opacity: 0.92, pattern: "" };
  if (terrain === "water") return { fill: "#0284c7", stroke: "#7dd3fc", opacity: 0.58, pattern: "url(#waterPattern)" };
  if (terrain === "lava") return { fill: "#dc2626", stroke: "#fdba74", opacity: 0.72, pattern: "url(#lavaPattern)" };
  if (terrain === "grass") return { fill: "#166534", stroke: "#86efac", opacity: 0.55, pattern: "url(#grassPattern)" };
  if (terrain === "dirt") return { fill: "#854d0e", stroke: "#d6a45c", opacity: 0.55, pattern: "url(#dirtPattern)" };
  if (terrain === "wood") return { fill: "#713f12", stroke: "#facc15", opacity: 0.5, pattern: "url(#woodPattern)" };
  if (terrain === "road") return { fill: "#52525b", stroke: "#a1a1aa", opacity: 0.5, pattern: "url(#roadPattern)" };
  if (terrain === "difficult") return { fill: "#701a75", stroke: "#f0abfc", opacity: 0.38, pattern: "url(#difficultPattern)" };
  return { fill: "#3f3f46", stroke: "#a1a1aa", opacity: 0.48, pattern: "url(#stonePattern)" };
}

export function MapBuilderShell({ initialMap, canEdit }: { initialMap: EditableMap; canEdit: boolean }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasShellRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<EditableMap>({ ...initialMap, layers: ensureDefaultLayers(initialMap.layers) });
  const initialEditorState = initialMap.editorState ?? {};
  const [activeTool, setActiveTool] = useState<Tool>((initialEditorState.selectedTool as Tool) || "select");
  const [activeLayerKey, setActiveLayerKey] = useState(layerKey(ensureDefaultLayers(initialMap.layers)[0]));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [corridorStart, setCorridorStart] = useState<GridPoint | null>(null);
  const [zoom, setZoom] = useState(safeNumber(initialEditorState.zoom, 1));
  const [pan, setPan] = useState<GridPoint>((initialEditorState.pan as GridPoint) ?? { x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(initialEditorState.showGrid !== false);
  const [rightOpen, setRightOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [cursorGrid, setCursorGrid] = useState<GridPoint>({ x: 0, y: 0 });

  const width = map.gridWidth * cell;
  const height = map.gridHeight * cell;
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const viewBox = `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`;
  const orderedLayers = useMemo(() => [...map.layers].sort((a, b) => a.order - b.order), [map.layers]);
  const activeLayer = map.layers.find((layer) => layerKey(layer) === activeLayerKey) ?? map.layers[0];
  const selectedElements = map.layers.flatMap((layer) => layer.data.elements).filter((element) => selectedIds.includes(element.id));
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const mapSettingsVisible = !selectedElement;
  const mobileWarning = "Map editing works best on tablet or desktop. Mobile supports viewing, simple edits, and metadata changes.";

  const getSnapshot = useCallback((): Snapshot => ({
    layers: cloneLayers(map.layers),
    sourceType: map.sourceType,
    editorState: { zoom, pan, selectedTool: activeTool, showGrid }
  }), [activeTool, map.layers, map.sourceType, pan, showGrid, zoom]);

  const pushHistory = useCallback(() => {
    const current = getSnapshot();
    setUndoStack((stack) => [...stack.slice(-historyLimit + 1), current]);
    setRedoStack([]);
  }, [getSnapshot]);

  const updateLayers = useCallback((updater: (layers: EditableLayer[]) => EditableLayer[], withHistory = true) => {
    if (withHistory) {
      const current = getSnapshot();
      setUndoStack((stack) => [...stack.slice(-historyLimit + 1), current]);
      setRedoStack([]);
    }
    setMap((current) => ({
      ...current,
      sourceType: current.sourceType === "AI_BLUEPRINT" ? "HYBRID" : current.sourceType,
      layers: updater(cloneLayers(current.layers)).map((layer, index) => ({ ...layer, order: index }))
    }));
  }, [getSnapshot]);

  function clientPoint(event: React.PointerEvent | PointerEvent): ClientPoint {
    return { x: event.clientX, y: event.clientY };
  }

  function clientToWorld(point: ClientPoint): GridPoint {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const relX = rect.width ? (point.x - rect.left) / rect.width : 0;
    const relY = rect.height ? (point.y - rect.top) / rect.height : 0;
    return { x: pan.x + relX * viewWidth, y: pan.y + relY * viewHeight };
  }

  function clientToGrid(point: ClientPoint): GridPoint {
    const world = clientToWorld(point);
    return {
      x: clamp(Math.round(world.x / cell), 0, map.gridWidth),
      y: clamp(Math.round(world.y / cell), 0, map.gridHeight)
    };
  }

  function elementLayer(elementId: string) {
    return map.layers.find((layer) => layer.data.elements.some((element) => element.id === elementId));
  }

  function canMoveElement(element: MapElement) {
    const layer = elementLayer(element.id);
    return canEdit && !element.locked && !layer?.locked;
  }

  function updateElements(ids: string[], transform: (element: MapElement) => MapElement, withHistory = true) {
    updateLayers((layers) => layers.map((layer) => ({
      ...layer,
      data: {
        elements: layer.data.elements.map((element) => ids.includes(element.id) ? transform(element) : element)
      }
    })), withHistory);
  }

  function addElementToLayer(element: MapElement, targetLayerKey = activeLayerKey) {
    const targetLayer = map.layers.find((layer) => layerKey(layer) === targetLayerKey) ?? layerForTool(element.type as Tool, map.layers);
    if (!canEdit || !targetLayer || targetLayer.locked) {
      setStatus("Choose an unlocked layer before placing that element.");
      return;
    }
    updateLayers((layers) => layers.map((layer) => layerKey(layer) === layerKey(targetLayer)
      ? { ...layer, data: { elements: [...layer.data.elements, element] } }
      : layer
    ));
    setSelectedIds([element.id]);
    setStatus(`Placed ${element.type.replace(/_/g, " ")}.`);
  }

  function selectElement(id: string, append: boolean) {
    setSelectedIds((current) => append ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]);
  }

  function deleteSelected() {
    if (!selectedIds.length || !canEdit) return;
    updateLayers((layers) => layers.map((layer) => ({
      ...layer,
      data: { elements: layer.data.elements.filter((element) => !selectedIds.includes(element.id) || element.locked || layer.locked) }
    })));
    setSelectedIds([]);
    setStatus("Selection deleted.");
  }

  function duplicateSelected() {
    if (!selectedIds.length || !canEdit) return;
    const copyBySourceId = new Map(selectedElements.filter(canMoveElement).map((element) => {
      const copy = moveElement({ ...cloneElement(element), id: makeId(element.type), name: `${element.name ?? element.type} copy` }, { x: 1, y: 1 }, map.gridWidth, map.gridHeight);
      return [element.id, copy] as const;
    }));
    if (!copyBySourceId.size) return;
    updateLayers((layers) => layers.map((layer) => ({
      ...layer,
      data: { elements: [...layer.data.elements, ...layer.data.elements.map((element) => copyBySourceId.get(element.id)).filter((copy): copy is MapElement => Boolean(copy))] }
    })));
    setSelectedIds([...copyBySourceId.values()].map((copy) => copy.id));
    setStatus("Selection duplicated.");
  }

  function rotateSelected(amount = 90) {
    if (!selectedIds.length || !canEdit) return;
    updateElements(selectedIds, (element) => canMoveElement(element) && rotatableTypes.has(element.type)
      ? { ...element, rotation: normalizeRotation((element.rotation ?? 0) + amount) }
      : element
    );
    setStatus("Selection rotated.");
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((stack) => [...stack.slice(-historyLimit + 1), getSnapshot()]);
    setUndoStack((stack) => stack.slice(0, -1));
    setMap((current) => ({ ...current, layers: cloneLayers(previous.layers), sourceType: previous.sourceType }));
    setZoom(safeNumber(previous.editorState.zoom, zoom));
    setPan((previous.editorState.pan as GridPoint) ?? pan);
    setShowGrid(previous.editorState.showGrid !== false);
    setSelectedIds([]);
    setStatus("Undo.");
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack.slice(-historyLimit + 1), getSnapshot()]);
    setRedoStack((stack) => stack.slice(0, -1));
    setMap((current) => ({ ...current, layers: cloneLayers(next.layers), sourceType: next.sourceType }));
    setZoom(safeNumber(next.editorState.zoom, zoom));
    setPan((next.editorState.pan as GridPoint) ?? pan);
    setShowGrid(next.editorState.showGrid !== false);
    setSelectedIds([]);
    setStatus("Redo.");
  }

  function startPan(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({ kind: "pan", pointerId: event.pointerId, startClient: clientPoint(event), originalPan: pan });
  }

  function pointerDownCanvas(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button === 1 || activeTool === "pan" || spaceDown) {
      event.preventDefault();
      startPan(event);
      return;
    }
    if (!canEdit) {
      setSelectedIds([]);
      return;
    }
    const point = clientToGrid(clientPoint(event));
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activeTool === "room") {
      pushHistory();
      setInteraction({ kind: "draw-room", pointerId: event.pointerId, start: point, current: point });
      return;
    }
    if (activeTool === "wall") {
      pushHistory();
      setInteraction({ kind: "draw-wall", pointerId: event.pointerId, start: point, current: point });
      return;
    }
    if (activeTool === "corridor") {
      if (!corridorStart) {
        setCorridorStart(point);
        setStatus("Choose corridor endpoint.");
      } else {
        addElementToLayer({ id: makeId("corridor"), type: "corridor", name: "corridor", points: [corridorStart, point], visibility: "DM_ONLY", metadata: {} });
        setCorridorStart(null);
      }
      return;
    }
    if (activeTool !== "select" && activeTool !== "eraser") {
      addElementToLayer(createElement(activeTool as MapElement["type"], point));
      return;
    }
    setInteraction({ kind: "marquee", pointerId: event.pointerId, start: point, current: point, append: event.shiftKey });
    if (!event.shiftKey) setSelectedIds([]);
  }

  function pointerDownElement(event: React.PointerEvent<SVGGElement>, element: MapElement) {
    event.stopPropagation();
    if (!canEdit) {
      selectElement(element.id, event.shiftKey);
      return;
    }
    if (activeTool === "eraser") {
      if (!canMoveElement(element)) return;
      updateLayers((layers) => layers.map((layer) => ({
        ...layer,
        data: { elements: layer.data.elements.filter((item) => item.id !== element.id) }
      })));
      setSelectedIds((ids) => ids.filter((id) => id !== element.id));
      setStatus("Element erased.");
      return;
    }
    selectElement(element.id, event.shiftKey);
    if (activeTool !== "select") return;
    if (!canMoveElement(element)) {
      setStatus("That element or layer is locked.");
      return;
    }
    const ids = event.shiftKey
      ? [...new Set([...selectedIds, element.id])]
      : selectedIds.includes(element.id)
        ? selectedIds
        : [element.id];
    const originals = map.layers
      .flatMap((layer) => layer.data.elements)
      .filter((item) => ids.includes(item.id) && canMoveElement(item))
      .map(cloneElement);
    if (!originals.length) return;
    pushHistory();
    (event.currentTarget.ownerSVGElement as SVGSVGElement | null)?.setPointerCapture(event.pointerId);
    setInteraction({
      kind: "move",
      ids: originals.map((item) => item.id),
      pointerId: event.pointerId,
      startClient: clientPoint(event),
      startGrid: clientToGrid(clientPoint(event)),
      originals,
      started: false
    });
  }

  function pointerDownResize(event: React.PointerEvent<SVGRectElement>, element: MapElement, handle: ResizeHandle) {
    event.stopPropagation();
    if (!canEdit || !element.bounds || !canMoveElement(element)) return;
    pushHistory();
    (event.currentTarget.ownerSVGElement as SVGSVGElement | null)?.setPointerCapture(event.pointerId);
    setInteraction({
      kind: "resize",
      id: element.id,
      handle,
      pointerId: event.pointerId,
      startClient: clientPoint(event),
      startGrid: clientToGrid(clientPoint(event)),
      original: cloneElement(element),
      started: false
    });
  }

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const point = clientToGrid(clientPoint(event));
    setCursorGrid(point);
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    if (interaction.kind === "pan") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((event.clientX - interaction.startClient.x) / rect.width) * viewWidth;
      const dy = ((event.clientY - interaction.startClient.y) / rect.height) * viewHeight;
      setPan({
        x: clamp(interaction.originalPan.x - dx, -width, width),
        y: clamp(interaction.originalPan.y - dy, -height, height)
      });
      return;
    }

    if (interaction.kind === "draw-room" || interaction.kind === "draw-wall") {
      setInteraction({ ...interaction, current: point });
      return;
    }

    if (interaction.kind === "marquee") {
      setInteraction({ ...interaction, current: point });
      return;
    }

    const movedPixels = Math.hypot(event.clientX - interaction.startClient.x, event.clientY - interaction.startClient.y);
    const started = interaction.started || movedPixels >= dragThresholdPx;
    if (!started) return;

    if (interaction.kind === "move") {
      const delta = { x: point.x - interaction.startGrid.x, y: point.y - interaction.startGrid.y };
      setInteraction({ ...interaction, started });
      updateLayers((layers) => layers.map((layer) => ({
        ...layer,
        data: {
          elements: layer.data.elements.map((element) => {
            const original = interaction.originals.find((item) => item.id === element.id);
            return original ? moveElement(original, delta, map.gridWidth, map.gridHeight) : element;
          })
        }
      })), false);
    }

    if (interaction.kind === "resize") {
      const delta = { x: point.x - interaction.startGrid.x, y: point.y - interaction.startGrid.y };
      setInteraction({ ...interaction, started });
      updateElements([interaction.id], () => resizeElement(interaction.original, interaction.handle, delta, map.gridWidth, map.gridHeight), false);
    }
  }

  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may release capture before React sees pointerup.
    }
    if (interaction.kind === "draw-room") {
      const x = Math.min(interaction.start.x, interaction.current.x);
      const y = Math.min(interaction.start.y, interaction.current.y);
      const roomWidth = Math.max(minElementSize, Math.abs(interaction.current.x - interaction.start.x));
      const roomHeight = Math.max(minElementSize, Math.abs(interaction.current.y - interaction.start.y));
      addElementToLayer(createElement("room", { x, y }, { bounds: { x, y, width: roomWidth, height: roomHeight }, terrainType: "stone", name: "room" }));
    }
    if (interaction.kind === "draw-wall") {
      addElementToLayer({
        id: makeId("wall"),
        type: "wall",
        name: "wall",
        points: [interaction.start, interaction.current],
        visibility: "DM_ONLY",
        metadata: {},
        blocksMovement: true,
        blocksVision: true
      });
    }
    if (interaction.kind === "marquee") {
      const bounds = {
        x: Math.min(interaction.start.x, interaction.current.x),
        y: Math.min(interaction.start.y, interaction.current.y),
        width: Math.max(1, Math.abs(interaction.current.x - interaction.start.x)),
        height: Math.max(1, Math.abs(interaction.current.y - interaction.start.y))
      };
      const hits = orderedLayers.flatMap((layer) => layer.visible
        ? layer.data.elements.filter((element) => {
            const elementBox = elementBounds(element);
            return elementBox ? boundsIntersect(bounds, elementBox) : false;
          })
        : []
      ).map((element) => element.id);
      if (hits.length) {
        setSelectedIds((current) => interaction.append ? [...new Set([...current, ...hits])] : hits);
        setStatus(`${hits.length} element${hits.length === 1 ? "" : "s"} selected.`);
      }
    }
    if (interaction.kind === "move" && interaction.started) setStatus("Selection moved.");
    if (interaction.kind === "resize" && interaction.started) setStatus("Selection resized.");
    setInteraction(null);
  }

  const zoomAtClientPoint = useCallback((point: ClientPoint, factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = rect.width ? (point.x - rect.left) / rect.width : 0.5;
    const relY = rect.height ? (point.y - rect.top) / rect.height : 0.5;
    const worldX = pan.x + relX * viewWidth;
    const worldY = pan.y + relY * viewHeight;
    const nextZoom = clamp(Number((zoom * factor).toFixed(2)), 0.25, 4);
    const nextViewWidth = width / nextZoom;
    const nextViewHeight = height / nextZoom;
    setZoom(nextZoom);
    setPan({
      x: clamp(worldX - relX * nextViewWidth, -width, width),
      y: clamp(worldY - relY * nextViewHeight, -height, height)
    });
  }, [height, pan.x, pan.y, viewHeight, viewWidth, width, zoom]);

  function fitToMap() {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const nextZoom = clamp(Math.min(rect.width / width, rect.height / height), 0.25, 4);
    setZoom(Number(nextZoom.toFixed(2)));
    setPan({ x: 0, y: 0 });
  }

  function nudge(delta: GridPoint) {
    if (!selectedIds.length || !canEdit) return;
    const amount = spaceDown ? 5 : 1;
    updateElements(selectedIds, (element) => canMoveElement(element) ? moveElement(element, { x: delta.x * amount, y: delta.y * amount }, map.gridWidth, map.gridHeight) : element);
    setStatus("Selection nudged.");
  }

  useEffect(() => {
    const node = canvasShellRef.current;
    if (!node) return;
    function onNativeWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAtClientPoint({ x: event.clientX, y: event.clientY }, event.deltaY > 0 ? 0.9 : 1.1);
    }
    node.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => node.removeEventListener("wheel", onNativeWheel);
  }, [zoomAtClientPoint]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    setRightOpen(query.matches);
    function onChange(event: MediaQueryListEvent) {
      setRightOpen(event.matches);
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpaceDown(true);
      }
      if (event.key.toLowerCase() === "v") setActiveTool("select");
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
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpaceDown(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  function updateSelected(updater: (element: MapElement) => MapElement) {
    if (!selectedElement || !canEdit) return;
    updateElements([selectedElement.id], updater);
  }

  function moveSelectedToLayer(targetKey: string) {
    if (!selectedIds.length || !canEdit) return;
    updateLayers((layers) => {
      const moving = layers.flatMap((layer) => layer.data.elements.filter((element) => selectedIds.includes(element.id) && !element.locked && !layer.locked));
      return layers.map((layer) => {
        if (layerKey(layer) === targetKey) return { ...layer, data: { elements: [...layer.data.elements, ...moving] } };
        return { ...layer, data: { elements: layer.data.elements.filter((element) => !moving.some((item) => item.id === element.id)) } };
      });
    });
    setActiveLayerKey(targetKey);
    setStatus("Selection moved to layer.");
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

  function renderResizeHandles(element: MapElement) {
    if (!element.bounds || !canEdit || !canMoveElement(element)) return null;
    const b = element.bounds;
    const handles: Array<[ResizeHandle, number, number, string]> = [
      ["nw", b.x, b.y, "cursor-nwse-resize"], ["n", b.x + b.width / 2, b.y, "cursor-ns-resize"], ["ne", b.x + b.width, b.y, "cursor-nesw-resize"],
      ["e", b.x + b.width, b.y + b.height / 2, "cursor-ew-resize"], ["se", b.x + b.width, b.y + b.height, "cursor-nwse-resize"],
      ["s", b.x + b.width / 2, b.y + b.height, "cursor-ns-resize"], ["sw", b.x, b.y + b.height, "cursor-nesw-resize"], ["w", b.x, b.y + b.height / 2, "cursor-ew-resize"]
    ];
    return (
      <>
        {handles.map(([handle, x, y, className]) => (
          <rect
            key={handle}
            x={x * cell - 6}
            y={y * cell - 6}
            width="12"
            height="12"
            rx="2"
            fill="#fff7ed"
            stroke="#111827"
            strokeWidth="1"
            className={className}
            onPointerDown={(event) => pointerDownResize(event, element, handle)}
          />
        ))}
        <circle
          cx={(b.x + b.width / 2) * cell}
          cy={(b.y - 0.9) * cell}
          r="7"
          fill="#c4b5fd"
          stroke="#111827"
          strokeWidth="1"
          className="cursor-alias"
          onPointerDown={(event) => {
            event.stopPropagation();
            rotateSelected(15);
          }}
        />
        <line x1={(b.x + b.width / 2) * cell} y1={b.y * cell} x2={(b.x + b.width / 2) * cell} y2={(b.y - 0.68) * cell} stroke="#c4b5fd" strokeWidth="1.5" />
      </>
    );
  }

  function renderElement(element: MapElement, layer: EditableLayer) {
    const selected = selectedIds.includes(element.id);
    const style = styleForElement(element);
    const locked = layer.locked || element.locked;
    const common = {
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => pointerDownElement(event, element),
      className: locked ? "cursor-not-allowed" : activeTool === "eraser" ? "cursor-crosshair" : "cursor-move"
    };
    const rotation = normalizeRotation(element.rotation);
    const bounds = elementBounds(element);
    const transform = bounds && rotation ? `rotate(${rotation} ${(bounds.x + bounds.width / 2) * cell} ${(bounds.y + bounds.height / 2) * cell})` : undefined;

    if (element.points?.length) {
      const points = element.points.map((point) => `${point.x * cell},${point.y * cell}`).join(" ");
      return (
        <g key={element.id} {...common}>
          <polyline points={points} fill="none" stroke={selected ? "#fff7ed" : style.stroke} strokeWidth={selected ? 9 : element.type === "wall" ? 6 : 5} strokeLinecap="round" strokeLinejoin="round" opacity={style.opacity} />
          {selected ? <polyline points={points} fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" /> : null}
        </g>
      );
    }

    if (element.position) {
      return (
        <g key={element.id} {...common}>
          <circle cx={element.position.x * cell} cy={element.position.y * cell} r={selected ? 12 : 8} fill={style.fill} stroke={selected ? "#fff7ed" : style.stroke} strokeWidth={selected ? 3 : 2} opacity={style.opacity} />
          <text x={element.position.x * cell + 12} y={element.position.y * cell - 8} fill="#fafafa" fontSize="13" paintOrder="stroke" stroke="#050509" strokeWidth="3">
            {element.label || element.name || element.type.replace(/_/g, " ")}
          </text>
        </g>
      );
    }

    if (!element.bounds) return null;
    return (
      <g key={element.id} {...common} transform={transform}>
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
        {element.type === "stairs" ? (
          <g stroke="#ddd6fe" strokeWidth="1.5" opacity="0.85">
            {Array.from({ length: Math.max(2, Math.floor(element.bounds.height)) }).map((_, index) => (
              <line key={index} x1={element.bounds!.x * cell + 5} y1={(element.bounds!.y + index + 0.5) * cell} x2={(element.bounds!.x + element.bounds!.width) * cell - 5} y2={(element.bounds!.y + index + 0.5) * cell} />
            ))}
          </g>
        ) : null}
        {element.name && element.bounds.width >= 2 && element.bounds.height >= 1.5 ? (
          <text x={element.bounds.x * cell + 8} y={element.bounds.y * cell + 18} fill="#fafafa" fontSize="12" paintOrder="stroke" stroke="#050509" strokeWidth="3">{element.name}</text>
        ) : null}
        {selected ? renderResizeHandles(element) : null}
      </g>
    );
  }

  const drawPreview = interaction?.kind === "draw-room" || interaction?.kind === "draw-wall" ? interaction : null;
  const marquee = interaction?.kind === "marquee" ? interaction : null;
  const selectionSummary = selectedIds.length ? `${selectedIds.length} selected` : "Nothing selected";
  const currentTool = spaceDown ? "Pan" : buildTools.find((item) => item.tool === activeTool)?.label ?? activeTool;

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-[#050509] text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#080811]/95 px-3 py-2 shadow-lg shadow-black/30 [padding-top:max(0.5rem,env(safe-area-inset-top))]">
        <button className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/[0.07]" onClick={() => router.push("/dashboard/maps")}>
          Back to Maps
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <input
              className="min-w-0 max-w-[520px] flex-1 truncate border-none bg-transparent text-sm font-black text-white outline-none sm:text-base"
              value={map.name}
              disabled={!canEdit}
              onChange={(event) => setMap({ ...map, name: event.target.value })}
              aria-label="Map name"
            />
            <span className="hidden rounded-full border border-violet/30 bg-violet/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet sm:inline-flex">
              {map.sourceType.replace(/_/g, " ")}
            </span>
          </div>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">{status}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button className="editor-top-button" disabled={!undoStack.length} onClick={undo}>Undo</button>
          <button className="editor-top-button" disabled={!redoStack.length} onClick={redo}>Redo</button>
          <button className="editor-top-button" onClick={() => setShowGrid((value) => !value)}>Grid {showGrid ? "On" : "Off"}</button>
          <button className="editor-top-button" onClick={() => zoomAtClientPoint({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, 1.15)}>{Math.round(zoom * 100)}%</button>
          <button className="editor-top-button" onClick={fitToMap}>Fit</button>
        </div>
        <button className="rounded-md bg-aureate px-3 py-2 text-sm font-black text-void shadow-sm shadow-aureate/20 disabled:opacity-50" disabled={!canEdit} onClick={saveMap}>
          Save
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[76px] shrink-0 overflow-hidden border-r border-white/10 bg-[#07070c] transition-all md:block">
          <div className="flex h-full flex-col gap-2 overflow-y-auto px-2 py-3">
            {buildTools.map((tool) => (
              <button
                key={tool.tool}
                className={`rounded-md border px-2 py-2.5 text-xs font-semibold transition ${activeTool === tool.tool ? "border-aureate/50 bg-aureate/15 text-aureate" : "border-white/10 bg-white/[0.03] text-zinc-200 hover:border-mana/40 hover:bg-mana/10"}`}
                disabled={!canEdit && tool.tool !== "select" && tool.tool !== "pan"}
                onClick={() => setActiveTool(tool.tool)}
                title={tool.label}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 bg-black/20 px-3 py-2 md:hidden">
            {buildTools.slice(0, 8).map((tool) => (
              <button
                key={tool.tool}
                className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold ${activeTool === tool.tool ? "border-aureate/50 bg-aureate/15 text-aureate" : "border-white/10 bg-white/[0.04] text-zinc-200"}`}
                disabled={!canEdit && tool.tool !== "select" && tool.tool !== "pan"}
                onClick={() => setActiveTool(tool.tool)}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div className="absolute left-3 top-14 z-10 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100 md:hidden">
            {mobileWarning}
          </div>
          <div ref={canvasShellRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#050509]">
            <svg
              ref={svgRef}
              className={`h-full w-full touch-none select-none ${activeTool === "pan" || spaceDown ? "cursor-grab" : activeTool === "eraser" ? "cursor-crosshair" : "cursor-default"}`}
              viewBox={viewBox}
              role="application"
              aria-label={`${map.name} full-screen editable grid`}
              onPointerDown={pointerDownCanvas}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
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
              <rect x={-width} y={-height} width={width * 3} height={height * 3} fill="#050509" />
              <rect width={width} height={height} fill="#09090f" stroke="rgba(250,204,21,0.18)" strokeWidth="2" />
              {showGrid ? <g stroke="rgba(255,255,255,0.09)" strokeWidth="1">{renderGridLines()}</g> : null}
              {orderedLayers.filter((layer) => layer.visible).map((layer) => (
                <g key={layerKey(layer)} opacity={layer.locked ? 0.55 : 1}>
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
                  opacity="0.62"
                />
              ) : null}
              {drawPreview?.kind === "draw-wall" ? (
                <line x1={drawPreview.start.x * cell} y1={drawPreview.start.y * cell} x2={drawPreview.current.x * cell} y2={drawPreview.current.y * cell} stroke="#fff7ed" strokeWidth="6" strokeDasharray="6 4" />
              ) : null}
              {marquee ? (
                <rect
                  x={Math.min(marquee.start.x, marquee.current.x) * cell}
                  y={Math.min(marquee.start.y, marquee.current.y) * cell}
                  width={Math.max(1, Math.abs(marquee.current.x - marquee.start.x)) * cell}
                  height={Math.max(1, Math.abs(marquee.current.y - marquee.start.y)) * cell}
                  fill="#60a5fa"
                  stroke="#bfdbfe"
                  strokeWidth="2"
                  opacity="0.16"
                />
              ) : null}
              {corridorStart ? <circle cx={corridorStart.x * cell} cy={corridorStart.y * cell} r="8" fill="#fff7ed" /> : null}
            </svg>
          </div>
        </main>

        <aside className={`${rightOpen ? "w-[340px]" : "w-0 border-0"} hidden shrink-0 overflow-hidden border-l border-white/10 bg-[#07070c] transition-all xl:block`}>
          <div className="flex h-full flex-col overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-200">{mapSettingsVisible ? "Map Inspector" : "Element Inspector"}</h2>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-400">{selectionSummary}</span>
            </div>

            {mapSettingsVisible ? (
              <div className="mt-4 grid gap-3">
                <label className="editor-label">Description<textarea className="editor-input min-h-24" value={map.description ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, description: event.target.value })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="editor-label">Width<input className="editor-input" type="number" min={5} max={200} disabled={!canEdit} value={map.gridWidth} onChange={(event) => setMap({ ...map, gridWidth: Number(event.target.value) })} /></label>
                  <label className="editor-label">Height<input className="editor-input" type="number" min={5} max={200} disabled={!canEdit} value={map.gridHeight} onChange={(event) => setMap({ ...map, gridHeight: Number(event.target.value) })} /></label>
                </div>
                <label className="editor-label">Theme<input className="editor-input" value={map.theme ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, theme: event.target.value })} /></label>
                <label className="editor-label">Environment<input className="editor-input" value={map.environment ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, environment: event.target.value })} /></label>
                <label className="editor-label">Lighting notes<textarea className="editor-input min-h-20" value={map.lightingNotes ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, lightingNotes: event.target.value })} /></label>
                <label className="editor-label">Interactive notes<textarea className="editor-input min-h-20" value={map.interactiveNotes ?? ""} disabled={!canEdit} onChange={(event) => setMap({ ...map, interactiveNotes: event.target.value })} /></label>
              </div>
            ) : selectedElement ? (
              <div className="mt-4 grid gap-3">
                <label className="editor-label">Name<input className="editor-input" value={selectedElement.name ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, name: event.target.value }))} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="editor-label">Type<input className="editor-input" value={selectedElement.type.replace(/_/g, " ")} disabled /></label>
                  <label className="editor-label">Rotation<input className="editor-input" type="number" value={selectedElement.rotation ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, rotation: Number(event.target.value) }))} /></label>
                </div>
                {selectedElement.bounds ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["x", "y", "width", "height"] as const).map((field) => (
                      <label key={field} className="editor-label">{field}<input className="editor-input" type="number" value={selectedElement.bounds?.[field] ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, bounds: { ...element.bounds!, [field]: Number(event.target.value) } }))} /></label>
                    ))}
                  </div>
                ) : null}
                {selectedElement.position ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(["x", "y"] as const).map((field) => (
                      <label key={field} className="editor-label">{field}<input className="editor-input" type="number" value={selectedElement.position?.[field] ?? 0} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, position: { ...element.position!, [field]: Number(event.target.value) } }))} /></label>
                    ))}
                  </div>
                ) : null}
                <label className="editor-label">Layer<select className="editor-input" value={elementLayer(selectedElement.id) ? layerKey(elementLayer(selectedElement.id)!) : ""} disabled={!canEdit} onChange={(event) => moveSelectedToLayer(event.target.value)}>{map.layers.map((layer) => <option key={layerKey(layer)} value={layerKey(layer)}>{layer.name}</option>)}</select></label>
                <label className="editor-label">Terrain<select className="editor-input" value={selectedElement.terrainType ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, terrainType: event.target.value || undefined }))}><option value="">None</option>{terrainOptions.map((terrain) => <option key={terrain} value={terrain}>{terrain}</option>)}</select></label>
                <label className="editor-label">Label<input className="editor-input" value={selectedElement.label ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, label: event.target.value }))} /></label>
                <label className="editor-label">DM notes<textarea className="editor-input min-h-24" value={selectedElement.note ?? ""} disabled={!canEdit} onChange={(event) => updateSelected((element) => ({ ...element, note: event.target.value }))} /></label>
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
            ) : null}

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-300">Layers</h3>
                <button className="rounded-md border border-mana/30 px-2 py-1 text-xs font-semibold text-mana disabled:opacity-40" disabled={!canEdit} onClick={addLayer}>Add</button>
              </div>
              <div className="mt-3 grid gap-2">
                {map.layers.map((layer, index) => {
                  const key = layerKey(layer);
                  return (
                    <div key={key} className={`rounded-md border p-2 ${activeLayerKey === key ? "border-aureate/35 bg-aureate/10" : "border-white/10 bg-black/20"}`}>
                      <input className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm font-semibold text-white" value={layer.name} disabled={!canEdit} onFocus={() => setActiveLayerKey(key)} onChange={(event) => changeLayer(index, { name: event.target.value })} />
                      <p className="mt-1 text-xs text-zinc-500">{layer.data.elements.length} elements</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button className="editor-mini-button" onClick={() => setActiveLayerKey(key)}>Active</button>
                        <button className="editor-mini-button" disabled={!canEdit} onClick={() => changeLayer(index, { visible: !layer.visible })}>{layer.visible ? "Hide" : "Show"}</button>
                        <button className="editor-mini-button" disabled={!canEdit} onClick={() => changeLayer(index, { locked: !layer.locked })}>{layer.locked ? "Unlock" : "Lock"}</button>
                        <button className="editor-mini-button" disabled={!canEdit || index === 0} onClick={() => moveLayer(index, -1)}>Up</button>
                        <button className="editor-mini-button" disabled={!canEdit || index === map.layers.length - 1} onClick={() => moveLayer(index, 1)}>Down</button>
                        <button className="rounded border border-crimson/30 px-2 py-1 text-xs text-crimson disabled:opacity-40" disabled={!canEdit || map.layers.length <= 1} onClick={() => deleteLayer(index)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#080811]/95 px-3 py-2 text-xs text-zinc-400 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex min-w-0 items-center gap-3">
          <span>Tool: <strong className="text-zinc-100">{currentTool}</strong></span>
          <span>Tile: {cursorGrid.x}, {cursorGrid.y}</span>
          <span className="hidden sm:inline">{selectionSummary}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="editor-mini-button xl:hidden" onClick={() => setRightOpen((value) => !value)}>Inspector</button>
          <span className="hidden md:inline">Wheel zooms canvas. Space + drag pans. Shift + arrows nudge farther.</span>
        </div>
      </footer>

      {rightOpen ? (
        <div className="fixed inset-y-0 right-0 z-50 w-[min(92vw,360px)] overflow-y-auto border-l border-white/10 bg-[#07070c] p-4 shadow-2xl shadow-black xl:hidden">
          <button className="mb-4 rounded-md border border-white/10 px-3 py-2 text-sm text-white" onClick={() => setRightOpen(false)}>Close inspector</button>
          <p className="text-sm text-zinc-300">{selectionSummary}. Use a tablet or desktop for full precision editing.</p>
        </div>
      ) : null}
    </div>
  );
}
