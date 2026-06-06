"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CampaignSession = {
  id: string;
  title: string;
  description: string | null;
  sessionNumber: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

export function SessionManager({ campaignId, sessions, canManage }: { campaignId: string; sessions: CampaignSession[]; canManage: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/campaigns/${campaignId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description })
    });
    if (!response.ok) {
      setMessage("Could not create session.");
      return;
    }
    setTitle("");
    setDescription("");
    setMessage("Session created.");
    router.refresh();
  }

  async function changeStatus(sessionId: string, action: "start" | "end" | "archive") {
    const response = await fetch(`/api/campaigns/${campaignId}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(body?.error || "Could not update session.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Sessions</h2>
        <Badge tone="gold">{sessions.length} total</Badge>
      </div>
      {canManage ? (
        <form className="mt-5 grid gap-3" onSubmit={createSession}>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Session title" required />
          <textarea className="min-h-20 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Markdown description" />
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="submit">Create session</button>
        </form>
      ) : null}
      {message ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      <div className="mt-5 grid gap-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-md border border-white/10 bg-black/25 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone={session.status === "ACTIVE" ? "stamina" : "mana"}>#{session.sessionNumber} {session.status}</Badge>
                <h3 className="mt-3 text-lg font-bold text-white">{session.title}</h3>
                {session.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{session.description}</p> : null}
              </div>
              {canManage ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <button className="rounded-md border border-stamina/30 px-3 py-2 text-sm text-stamina" onClick={() => changeStatus(session.id, "start")} type="button">Start</button>
                  <button className="rounded-md border border-aureate/30 px-3 py-2 text-sm text-aureate" onClick={() => changeStatus(session.id, "end")} type="button">End</button>
                  <button className="rounded-md border border-crimson/30 px-3 py-2 text-sm text-crimson" onClick={() => changeStatus(session.id, "archive")} type="button">Archive</button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
