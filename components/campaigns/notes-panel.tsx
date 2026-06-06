"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Note = {
  id: string;
  title: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: { name: string | null; username: string };
  character: { name: string } | null;
};

type SessionOption = { id: string; title: string };
type CharacterOption = { id: string; name: string };

export function NotesPanel({ campaignId, notes, sessions, characters, canDm }: { campaignId: string; notes: Note[]; sessions: SessionOption[]; characters: CharacterOption[]; canDm: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [visibility, setVisibility] = useState("CAMPAIGN_SHARED");
  const [message, setMessage] = useState<string | null>(null);

  async function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/campaigns/${campaignId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, visibility, sessionId: sessionId || undefined, characterId: characterId || undefined })
    });
    if (!response.ok) {
      setMessage("Could not create note.");
      return;
    }
    setTitle("");
    setBody("");
    setMessage("Note created.");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white">Notes</h2>
      <form className="mt-5 grid gap-3" onSubmit={createNote}>
        <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" required />
        <textarea className="min-h-28 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Markdown note body" required />
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="CAMPAIGN_SHARED">Campaign shared</option>
            <option value="CHARACTER_PRIVATE">Character private</option>
            {canDm ? <option value="DM_ONLY">DM only</option> : null}
          </select>
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            <option value="">No session</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
          </select>
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
            <option value="">No character</option>
            {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
          </select>
        </div>
        <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">Save note</button>
      </form>
      {message ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
      <div className="mt-5 grid gap-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={note.visibility === "DM_ONLY" ? "crimson" : "mana"}>{note.visibility.replace(/_/g, " ")}</Badge>
              {note.character ? <Badge tone="gold">{note.character.name}</Badge> : null}
            </div>
            <h3 className="mt-3 font-bold text-white">{note.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{note.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
