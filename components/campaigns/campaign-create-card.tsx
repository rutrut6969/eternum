"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export function CampaignCreateCard({ canCreateCampaign, createCampaignMessage }: { canCreateCampaign: boolean; createCampaignMessage?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, settings: { tone: "dark_fantasy", approvalsRequired: true } })
    });
    const body = (await response.json().catch(() => null)) as { campaign?: { id: string }; error?: string } | null;
    setLoading(false);
    if (!response.ok || !body?.campaign?.id) {
      setMessage(body?.error || "Could not create campaign.");
      return;
    }
    router.push(`/dashboard/campaigns/${body.campaign.id}`);
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-white">Create campaign</h2>
      {canCreateCampaign ? (
        <form className="mt-4 grid gap-3" onSubmit={createCampaign}>
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-aureate" placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} required />
          <textarea className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-aureate" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {message ? <p className="rounded-md border border-crimson/25 bg-crimson/10 p-3 text-sm text-crimson">{message}</p> : null}
          <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create and open"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {createCampaignMessage || "Campaign creation is unavailable for this account. You can still join campaigns by invite and manage characters."}
        </p>
      )}
    </Card>
  );
}
