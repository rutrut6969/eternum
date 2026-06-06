import { ContentType } from "@prisma/client";
import { withRandomSuffix } from "@/lib/slug";

export function slugForHomebrew(title: string) {
  return withRandomSuffix(title);
}

export function labelForContentType(type: ContentType | string) {
  return String(type).toLowerCase().replace(/_/g, " ");
}
