"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PendingAnalysis = {
  id: string;
  status: string;
  suggestion: unknown;
  character: { name: string; owner: { name: string | null; email: string } };
};

export function BackstoryApprovalPanel({ analyses }: { analyses: PendingAnalysis[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function review(id: string, action: "approve" | "reject" | "request_edits") {
    await fetch(`/api/backstory-analyses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: notes[id] })
    });
    router.refresh();
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-bold text-white">Approval queue</h2>
        <p className="mt-3 text-sm text-zinc-300">No pending backstory suggestions right now.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {analyses.map((analysis) => (
        <Card key={analysis.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="violet">{analysis.status}</Badge>
              <h3 className="mt-3 text-xl font-bold text-white">{analysis.character.name}</h3>
              <p className="text-sm text-zinc-400">{analysis.character.owner.name || analysis.character.owner.email}</p>
            </div>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-300">{JSON.stringify(analysis.suggestion, null, 2)}</pre>
          <textarea className="mt-4 min-h-20 w-full rounded-md border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-aureate" placeholder="DM review note" value={notes[analysis.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [analysis.id]: event.target.value }))} />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button className="rounded-md bg-stamina px-4 py-3 font-semibold text-void" onClick={() => review(analysis.id, "approve")} type="button">Approve</button>
            <button className="rounded-md border border-aureate/30 px-4 py-3 font-semibold text-aureate" onClick={() => review(analysis.id, "request_edits")} type="button">Request edits</button>
            <button className="rounded-md border border-crimson/30 px-4 py-3 font-semibold text-crimson" onClick={() => review(analysis.id, "reject")} type="button">Reject</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
