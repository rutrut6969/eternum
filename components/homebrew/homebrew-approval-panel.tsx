"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HomebrewImageUploader } from "@/components/homebrew/homebrew-image-uploader";

type HomebrewApproval = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  status: string;
  rarity: string | null;
  discipline: string | null;
  publishRequestedAt: string | null;
  body: unknown;
  rulesResult: unknown;
  generatedByAi: boolean;
  imageUrl: string | null;
  imageAltText: string | null;
  campaign: { id: string; name: string } | null;
  character: { id: string; name: string } | null;
  submittedAt: string;
  updatedAt: string;
  currentRevisionNumber: number | null;
  author: { name: string | null; username: string; email: string };
};

export function HomebrewApprovalPanel({ items }: { items: HomebrewApproval[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function review(id: string, action: "approve_private" | "approve_public" | "reject" | "request_edits" | "archive") {
    if ((action === "reject" || action === "request_edits") && !notes[id]?.trim()) {
      setMessage("DM feedback is required to deny or request edits.");
      return;
    }
    const response = await fetch(`/api/homebrew/${id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: notes[id] })
    });
    if (!response.ok) {
      setMessage("Could not review homebrew.");
      return;
    }
    setMessage("Review saved.");
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-white">Homebrew approval queue</h2>
        <p className="mt-3 text-sm text-zinc-300">No pending custom spells, items, crafted items, or publish requests.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="violet">{item.type}</Badge>
                {item.publishRequestedAt ? <Badge tone="gold">publish request</Badge> : null}
                {item.rarity ? <Badge tone="mana">{item.rarity}</Badge> : null}
                {item.generatedByAi ? <Badge tone="mana">AI draft</Badge> : null}
                <Badge tone="violet">Revision {item.currentRevisionNumber ?? 1}</Badge>
              </div>
              <h3 className="mt-3 text-xl font-bold text-white">{item.title}</h3>
              {item.imageUrl ? <img className="mt-4 aspect-video w-full rounded-md object-cover" src={item.imageUrl} alt={item.imageAltText || item.title} /> : null}
              <p className="mt-1 text-sm text-zinc-400">By {item.author.name || item.author.username || item.author.email}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {item.campaign?.name || "No campaign"} / {item.character?.name || "No linked character"} / Submitted {new Date(item.submittedAt).toLocaleDateString()} / Updated {new Date(item.updatedAt).toLocaleDateString()}
              </p>
              {item.summary ? <p className="mt-3 text-sm leading-6 text-zinc-300">{item.summary}</p> : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <pre className="max-h-64 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(item.body, null, 2)}</pre>
            <pre className="max-h-64 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(item.rulesResult, null, 2)}</pre>
          </div>
          <HomebrewImageUploader homebrewId={item.id} />
          <textarea
            className="mt-4 min-h-24 w-full rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-aureate"
            placeholder="DM feedback. Required for Deny or Request Edits; optional for approvals."
            value={notes[item.id] ?? ""}
            onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <button className="rounded-md bg-stamina px-3 py-3 font-semibold text-void" onClick={() => review(item.id, "approve_private")} type="button">Approve private</button>
            <button className="rounded-md bg-aureate px-3 py-3 font-semibold text-void" onClick={() => review(item.id, "approve_public")} type="button">Approve public</button>
            <button className="rounded-md border border-aureate/30 px-3 py-3 font-semibold text-aureate" onClick={() => review(item.id, "request_edits")} type="button">Request edits</button>
            <button className="rounded-md border border-crimson/30 px-3 py-3 font-semibold text-crimson" onClick={() => review(item.id, "reject")} type="button">Reject</button>
            <button className="rounded-md border border-white/20 px-3 py-3 font-semibold text-zinc-300" onClick={() => review(item.id, "archive")} type="button">Archive</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
