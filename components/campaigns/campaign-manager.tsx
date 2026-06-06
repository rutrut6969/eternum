"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MemberRoleEditor } from "@/components/campaigns/member-role-editor";

type CampaignSummary = {
  id: string;
  name: string;
  description: string | null;
  settings: unknown;
  members: Array<{ id: string; userId: string; roles: string[]; user: { name: string | null; email: string; username?: string } }>;
  invites: Array<{ id: string; email: string; token: string; roles: string[]; status: string }>;
  characters: Array<{ id: string; name: string }>;
  counts?: { rolls: number; approvals: number };
};

export function CampaignManager({ campaigns }: { campaigns: CampaignSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, settings: { tone: "dark_fantasy", approvalsRequired: true } })
    });
    setLoading(false);
    if (!response.ok) {
      setMessage("Could not create campaign.");
      return;
    }
    setName("");
    setDescription("");
    setMessage("Campaign created.");
    router.refresh();
  }

  async function updateCampaign(campaignId: string, field: "name" | "description", value: string) {
    await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value })
    });
    router.refresh();
  }

  async function updateSettings(campaignId: string, fallback: unknown) {
    const raw = settingsDraft[campaignId] ?? JSON.stringify(fallback ?? {}, null, 2);
    try {
      const settings = JSON.parse(raw) as Record<string, unknown>;
      await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      });
      setMessage("Settings updated.");
      router.refresh();
    } catch {
      setMessage("Settings must be valid JSON.");
    }
  }

  async function archiveCampaign(campaignId: string) {
    await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
    router.refresh();
  }

  async function createInvite(campaignId: string) {
    const email = inviteEmail[campaignId];
    if (!email) return;
    const response = await fetch(`/api/campaigns/${campaignId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roles: ["PLAYER"] })
    });
    if (!response.ok) {
      setMessage("Could not create invite.");
      return;
    }
    setInviteEmail((current) => ({ ...current, [campaignId]: "" }));
    setMessage("Invite created.");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.45fr_1fr]">
      <Card>
        <h2 className="text-2xl font-bold text-white">Create campaign</h2>
        <form className="mt-5 space-y-4" onSubmit={createCampaign}>
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-aureate" placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} required />
          <textarea className="min-h-28 w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-aureate" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
          <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create campaign"}
          </button>
        </form>
      </Card>

      <div className="grid gap-5">
        {campaigns.length === 0 ? (
          <Card>
            <h2 className="text-xl font-bold text-white">No campaigns yet</h2>
            <p className="mt-3 text-sm text-zinc-300">Create your first campaign to unlock invites, characters, approvals, and dice logs.</p>
          </Card>
        ) : null}
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <input className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xl font-bold text-white outline-none focus:border-aureate" defaultValue={campaign.name} onBlur={(event) => updateCampaign(campaign.id, "name", event.target.value)} />
                <textarea className="mt-3 min-h-20 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-aureate" defaultValue={campaign.description ?? ""} placeholder="Campaign description" onBlur={(event) => updateCampaign(campaign.id, "description", event.target.value)} />
                <Link className="mt-3 inline-flex rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana" href={`/dashboard/campaigns/${campaign.id}`}>
                  Open campaign dashboard
                </Link>
              </div>
              <button className="rounded-md border border-crimson/30 px-4 py-2 text-sm font-semibold text-crimson hover:bg-crimson/10" onClick={() => archiveCampaign(campaign.id)} type="button">
                Archive
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Members</p>
                <div className="mt-3 space-y-2">
                  {campaign.members.map((member) => (
                    <div key={member.id} className="text-sm text-zinc-300">
                      <span className="block truncate">{member.user.name || member.user.email}</span>
                      <span className="text-xs text-aureate">{member.roles.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Invite player</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                  <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-mana" placeholder="email@example.com" value={inviteEmail[campaign.id] ?? ""} onChange={(event) => setInviteEmail((current) => ({ ...current, [campaign.id]: event.target.value }))} />
                  <button className="rounded-md bg-mana px-3 py-2 text-sm font-semibold text-void" onClick={() => createInvite(campaign.id)} type="button">
                    Invite
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {campaign.invites.map((invite) => (
                    <div key={invite.id} className="rounded-md bg-white/5 p-2 text-xs text-zinc-300">
                      <span className="block truncate">{invite.email}</span>
                      <code className="block break-all text-mana">{invite.token}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Campaign state</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="mana">{campaign.characters.length} characters</Badge>
                  <Badge tone="violet">{campaign.counts?.approvals ?? 0} approvals</Badge>
                  <Badge tone="gold">{campaign.counts?.rolls ?? 0} rolls</Badge>
                </div>
                <textarea
                  className="mt-4 min-h-24 w-full rounded-md border border-white/10 bg-black/30 p-2 font-mono text-xs text-zinc-200 outline-none focus:border-aureate"
                  value={settingsDraft[campaign.id] ?? JSON.stringify(campaign.settings ?? {}, null, 2)}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, [campaign.id]: event.target.value }))}
                />
                <button className="mt-2 w-full rounded-md border border-aureate/30 px-3 py-2 text-sm font-semibold text-aureate" onClick={() => updateSettings(campaign.id, campaign.settings)} type="button">
                  Save settings
                </button>
              </div>
            </div>

            <div className="mt-5">
              <MemberRoleEditor campaignId={campaign.id} members={campaign.members} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
