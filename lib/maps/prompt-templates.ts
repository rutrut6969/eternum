export type MapPromptOptions = {
  prompt: string;
  gridType?: "square" | "hex" | "none";
  environment?: string;
  theme?: string;
  width?: number;
  height?: number;
};

export function buildTopDownBattleMapPrompt(options: MapPromptOptions) {
  const gridLine = options.gridType === "none"
    ? "Do not draw a visible grid, but keep terrain aligned for later VTT grid overlay."
    : `Use ${options.gridType ?? "square"} grid-friendly composition with clear alignment for a ${options.width ?? 30} by ${options.height ?? 30} battle map.`;

  return [
    "Create a top-down fantasy battle map for virtual tabletop play.",
    "The image must have clear terrain silhouettes, readable paths, strong obstacle boundaries, and high contrast between walkable and blocked areas.",
    "Do not include text labels, UI, watermarks, perspective camera tilt, characters, tokens, or decorative title banners.",
    "Keep the composition VTT-friendly with tactical cover, entrances, exits, encounter zones, and clean token readability.",
    gridLine,
    options.environment ? `Environment: ${options.environment}.` : null,
    options.theme ? `Theme: ${options.theme}.` : null,
    `Map concept: ${options.prompt.trim()}`
  ].filter(Boolean).join(" ");
}

export function buildEditableMapBlueprintPrompt(options: MapPromptOptions) {
  return [
    "Create an editable virtual tabletop map blueprint as strict JSON only.",
    "Do not create an image. Do not include markdown, comments, prose, labels baked into terrain, UI text, watermarks, or brand references.",
    "The map must be top-down in structure, square-grid aligned, VTT-friendly, and easy for a DM to edit manually.",
    "Use clear tactical terrain, readable entrances and exits, sensible room/corridor flow, high-contrast obstacle concepts, and token-friendly spaces.",
    "Return JSON matching this TypeScript shape exactly enough to parse:",
    "{ version: 1, name: string, description?: string, theme?: string, grid: { type: 'square', width: number, height: number, cellSize?: number }, layers: [{ name: string, order: number, visible: boolean, locked: boolean, elements: MapElement[] }], lightingNotes?: string, spawnPoints?: unknown[], suggestedEncounters?: unknown[], dmNotes?: string }.",
    "Allowed MapElement types: room, corridor, wall, door, window, stairs, terrain, obstacle, spawn_point, secret_area, label, lighting_note.",
    "Elements must use grid-space coordinates only: bounds { x, y, width, height }, position { x, y }, or points [{ x, y }].",
    "Keep every coordinate inside the grid. Prefer 2-8 rooms for normal prompts unless the DM asks otherwise.",
    `Grid: square ${options.width ?? 30} by ${options.height ?? 30}.`,
    options.environment ? `Environment: ${options.environment}.` : null,
    options.theme ? `Theme: ${options.theme}.` : null,
    `DM prompt: ${options.prompt.trim()}`
  ].filter(Boolean).join("\n");
}

export const aiMapGenerationFlow = [
  "DM enters a map prompt.",
  "AI generates a structured, editable map blueprint first.",
  "The blueprint is validated against Eternum map rules and grid bounds.",
  "Validated rooms, corridors, terrain, notes, spawn points, and secrets are saved as map layer data.",
  "DM edits the map manually in the builder.",
  "DM attaches the map to a campaign or session.",
  "DM can request public publication.",
  "Approved public maps appear in the public map library.",
  "Later, optional AI image generation can create Blob-backed visual references without replacing editable data."
];
