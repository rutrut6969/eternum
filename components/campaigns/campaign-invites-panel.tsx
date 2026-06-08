"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Invite = {
  id: string;
  email: string;
  roles: string[];
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

const roles = ["PLAYER", "ASSISTANT_DM", "SPECTATOR"];

export function CampaignInvitesPanel({ campaignId, invites, canManage }: { campaignId: string; invites: Invite[]; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["PLAYER"]);
  const [message, setMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteLinks = useMemo(() => {
    return Object.fromEntries(invites.map((invite) => [invite.id, `${origin}/invite/${invite.token}`]));
  }, [invites, origin]);

  function toggleRole(role: string) {
    setSelectedRoles((current) => {
      const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role];
      return next.length ? next : current;
    });
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/campaigns/${campaignId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, roles: selectedRoles })
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error || "Could not create invite.");
      return;
    }
    setEmail("");
    setSelectedRoles(["PLAYER"]);
    setMessage("Invite created.");
    router.refresh();
  }

  async function copyInvite(link: string) {
    await navigator.clipboard.writeText(link);
    setMessage("Invite link copied.");
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Invites</h2>
        <Badge tone="mana">{invites.length} total</Badge>
      </div>
      {canManage ? (
        <form className="mt-5 grid gap-3" onSubmit={createInvite}>
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" placeholder="player@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <div className="grid gap-2 sm:grid-cols-3">
            {roles.map((role) => (
              <label key={role} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200">
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
                {role.replace("_", " ")}
              </label>
            ))}
          </div>
          <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">Create invite link</button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-zinc-300">Only DMs and Assistant DMs can create campaign invites.</p>
      )}
      {message ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      <div className="mt-5 grid gap-3">
        {invites.length === 0 ? <p className="text-sm text-zinc-300">No invites have been created yet.</p> : null}
        {invites.map((invite) => {
          const link = inviteLinks[invite.id] || `/invite/${invite.token}`;
          return (
            <div key={invite.id} className="rounded-md border border-white/10 bg-black/25 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{invite.email}</p>
                  <p className="mt-1 text-xs text-zinc-500">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={invite.status === "PENDING" ? "gold" : "mana"}>{invite.status}</Badge>
                    {invite.roles.map((role) => <Badge key={role} tone="violet">{role.replace("_", " ")}</Badge>)}
                  </div>
                </div>
                <button className="rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana" type="button" onClick={() => copyInvite(link)}>
                  Copy link
                </button>
              </div>
              <p className="mt-3 break-all rounded bg-black/30 p-2 text-xs text-zinc-400">{link}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
