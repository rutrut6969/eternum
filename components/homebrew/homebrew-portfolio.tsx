"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HomebrewImageUploader } from "@/components/homebrew/homebrew-image-uploader";

type HomebrewItem = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  publishRequestedAt: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
};

export function HomebrewPortfolio({ items }: { items: HomebrewItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function requestPublish(id: string) {
    const response = await fetch(`/api/homebrew/${id}/publish-request`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || "Could not request publication.");
      return;
    }
    setMessage("Public publish request sent to DM.");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white">My homebrew</h2>
      {message ? <p className="mt-4 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      <div className="mt-5 grid gap-3">
        {items.length === 0 ? <p className="text-sm text-zinc-300">No custom spells or items yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="violet">{item.type}</Badge>
                  <Badge tone={item.status === "APPROVED_PUBLIC" ? "gold" : "mana"}>{item.status}</Badge>
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
                {item.imageUrl ? <img className="mt-3 aspect-video w-full rounded-md object-cover" src={item.imageUrl} alt={item.imageAltText || item.title} /> : null}
                {item.summary ? <p className="mt-2 text-sm text-zinc-300">{item.summary}</p> : null}
              </div>
              {item.status === "APPROVED_PRIVATE" && !item.publishRequestedAt ? (
                <button className="rounded-md border border-aureate/30 px-3 py-2 text-sm font-semibold text-aureate" onClick={() => requestPublish(item.id)} type="button">
                  Request public
                </button>
              ) : null}
            </div>
            {item.status !== "APPROVED_PUBLIC" && item.status !== "ARCHIVED" ? <HomebrewImageUploader homebrewId={item.id} /> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
