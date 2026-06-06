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

export const aiMapGenerationFlow = [
  "DM enters a map prompt.",
  "AI generates a top-down, no-label VTT battle map image.",
  "Generated image is saved to Blob storage.",
  "Map metadata, prompt, tags, grid, notes, spawn points, lighting notes, and encounter suggestions are saved.",
  "DM attaches the map to a campaign or session.",
  "DM can request public publication.",
  "Approved public maps appear in the public map library."
];
