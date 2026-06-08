"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CampaignSettingsPanelProps = {
  campaignId: string;
  name: string;
  description: string | null;
  archived: boolean;
  settings: unknown;
  canManage: boolean;
};

export function CampaignSettingsPanel({ campaignId, name, description, archived, settings, canManage }: CampaignSettingsPanelProps) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [settingsDraft, setSettingsDraft] = useState(JSON.stringify(settings ?? {}, null, 2));
  const [message, setMessage] = useState<string | null>(null);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsedSettings = JSON.parse(settingsDraft) as Record<string, unknown>;
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, description: draftDescription, settings: parsedSettings })
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(body?.error || "Could not save campaign settings.");
        return;
      }
      setMessage("Campaign settings saved.");
      router.refresh();
    } catch {
      setMessage("Campaign rules/config must be valid JSON.");
    }
  }

  async function archiveCampaign() {
    const response = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Could not archive campaign.");
      return;
    }
    setMessage("Campaign archived.");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <Badge tone={archived ? "crimson" : "mana"}>{archived ? "Archived" : "Active"}</Badge>
      </div>
      {canManage ? (
        <form className="mt-5 grid gap-3" onSubmit={saveSettings}>
          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Name
            <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftName} onChange={(event) => setDraftName(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Description
            <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-200">
            Campaign rules/config JSON
            <textarea className="min-h-40 rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs text-zinc-200" value={settingsDraft} onChange={(event) => setSettingsDraft(event.target.value)} />
          </label>
          {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Save settings</button>
            <button className="rounded-md border border-crimson/30 px-4 py-3 font-semibold text-crimson hover:bg-crimson/10" type="button" onClick={archiveCampaign}>
              Archive campaign
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-zinc-300">Only DMs and Assistant DMs can edit campaign settings.</p>
      )}
    </Card>
  );
}
