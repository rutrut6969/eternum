"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = {
  id: string;
  userId: string;
  roles: string[];
  user: { name: string | null; email: string; username?: string };
};

const allRoles = ["DM", "PLAYER", "ASSISTANT_DM", "SPECTATOR"];

export function MemberRoleEditor({ campaignId, members }: { campaignId: string; members: Member[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string[]>>(() => Object.fromEntries(members.map((member) => [member.id, member.roles])));
  const [message, setMessage] = useState<string | null>(null);

  function toggle(memberId: string, role: string) {
    setDrafts((current) => {
      const roles = current[memberId] ?? [];
      const next = roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];
      return { ...current, [memberId]: next.length ? next : roles };
    });
  }

  async function save(memberId: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles: drafts[memberId] })
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error || "Could not update roles.");
      return;
    }
    setMessage("Roles updated.");
    router.refresh();
  }

  return (
    <section className="rounded-md border border-white/10 bg-black/20 p-4">
      <h3 className="text-xl font-bold text-white">Member roles</h3>
      {message ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      <div className="mt-4 grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{member.user.name || member.user.username || member.user.email}</p>
                <p className="truncate text-xs text-zinc-500">{member.user.email}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {allRoles.map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200">
                    <input type="checkbox" checked={(drafts[member.id] ?? []).includes(role)} onChange={() => toggle(member.id, role)} />
                    {role.replace("_", " ")}
                  </label>
                ))}
              </div>
              <button className="rounded-md bg-aureate px-4 py-2 text-sm font-semibold text-void" onClick={() => save(member.id)} type="button">Save</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
