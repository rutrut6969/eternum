export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 72);
}

export function withRandomSuffix(base: string) {
  return `${slugify(base) || "campaign"}-${Math.random().toString(36).slice(2, 8)}`;
}
