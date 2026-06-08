export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const maxImageSizeBytes = 5 * 1024 * 1024;
export const maxMapImageSizeBytes = 25 * 1024 * 1024;
export const maxDungeonScrawlFileSizeBytes = 10 * 1024 * 1024;

export function validateImageUpload(file: File | null) {
  if (!file) return { valid: false, message: "Choose an image file." };
  if (!allowedImageTypes.includes(file.type)) {
    return { valid: false, message: "Use a JPG, PNG, WebP, or GIF image." };
  }
  if (file.size > maxImageSizeBytes) {
    return { valid: false, message: "Image must be 5MB or smaller." };
  }
  return { valid: true };
}

export function validateMapImageUpload(file: File | null) {
  if (!file) return { valid: false, message: "Choose a map image file." };
  if (!allowedImageTypes.includes(file.type)) {
    return { valid: false, message: "Use a JPG, PNG, WebP, or GIF map image." };
  }
  if (file.size > maxMapImageSizeBytes) {
    return { valid: false, message: "Map image must be 25MB or smaller." };
  }
  return { valid: true };
}

export function validateDungeonScrawlUpload(file: File | null) {
  if (!file) return { valid: false, message: "Choose a Dungeon Scrawl .ds project file." };
  if (!file.name.toLowerCase().endsWith(".ds")) {
    return { valid: false, message: "Upload a Dungeon Scrawl .ds project file." };
  }
  if (file.size > maxDungeonScrawlFileSizeBytes) {
    return { valid: false, message: "Dungeon Scrawl project files must be 10MB or smaller." };
  }
  return { valid: true };
}
