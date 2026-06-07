"use client";

import { useEffect, useState } from "react";

type ThreadSummary = {
  id: string;
  title: string;
  messages?: { content: string; role: string; createdAt: string }[];
  workflows?: { type: string; status: string }[];
};

type AssistantResponse = {
  threadId: string;
  intent?: { type: string; label: string };
  payload?: {
    summary?: string;
    questions?: string[];
    suggestedNextActions?: string[];
    rulesEngineNotes?: string[];
    dmApprovalRequired?: boolean;
  };
  error?: string;
};

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [responses, setResponses] = useState<AssistantResponse[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/threads")
      .then((response) => response.json())
      .then((body) => setThreads(body.threads ?? []))
      .catch(() => setThreads([]));
  }, [open]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus("Thinking...");
    const response = await fetch("/api/assistant/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId: activeThreadId })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(body.error || "Assistant unavailable.");
      return;
    }
    setActiveThreadId(body.threadId);
    setResponses((current) => [body, ...current].slice(0, 8));
    setMessage("");
    setStatus("");
  }

  return (
    <>
      <button
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 rounded-full border border-mana/40 bg-[#07111f] px-4 py-3 text-sm font-bold text-mana shadow-lg shadow-black/30 hover:bg-mana/10"
        onClick={() => setOpen(true)}
      >
        Eternum AI
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70]">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close assistant" onClick={() => setOpen(false)} />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col border-l border-mana/20 bg-[#07070c] p-4 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-2xl shadow-black/50 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mana">Unified Assistant</p>
                <h2 className="mt-2 text-2xl font-black text-white">Eternum AI</h2>
                <p className="mt-1 text-sm text-zinc-400">Suggestions only. Rules engine math and DM approval still gate campaign use.</p>
              </div>
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2 sm:max-h-none">
                <button className="mb-2 w-full rounded-md bg-aureate px-3 py-2 text-sm font-semibold text-void" onClick={() => { setActiveThreadId(undefined); setResponses([]); }}>
                  New thread
                </button>
                {threads.length === 0 ? <p className="p-2 text-xs leading-5 text-zinc-500">No saved assistant threads yet.</p> : null}
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    className={`mb-2 w-full rounded-md border px-3 py-2 text-left text-xs ${activeThreadId === thread.id ? "border-mana/40 bg-mana/10 text-mana" : "border-white/10 bg-white/[0.03] text-zinc-300"}`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <span className="block truncate font-semibold">{thread.title}</span>
                    <span className="mt-1 block truncate text-zinc-500">{thread.workflows?.[0]?.type?.replace(/_/g, " ").toLowerCase() ?? "assistant"}</span>
                  </button>
                ))}
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="max-h-[48dvh] flex-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3">
                  {responses.length === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 p-4">
                      <p className="font-semibold text-white">Try one prompt</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">“Help me make a shadow spell,” “Create an NPC merchant,” or “Explain Eternum stamina.”</p>
                    </div>
                  ) : null}
                  <div className="grid gap-3">
                    {responses.map((response, index) => (
                      <article key={`${response.threadId}-${index}`} className="rounded-md border border-white/10 bg-[#0d0d14] p-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-mana/30 bg-mana/10 px-2 py-1 text-xs font-semibold text-mana">{response.intent?.label ?? "Assistant"}</span>
                          {response.payload?.dmApprovalRequired ? <span className="rounded-full border border-aureate/30 bg-aureate/10 px-2 py-1 text-xs font-semibold text-aureate">DM approval</span> : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-100">{response.payload?.summary ?? response.error ?? "Assistant response saved."}</p>
                        {response.payload?.questions?.length ? <p className="mt-3 text-xs leading-5 text-zinc-400">Questions: {response.payload.questions.join(" / ")}</p> : null}
                        {response.payload?.suggestedNextActions?.length ? <p className="mt-2 text-xs leading-5 text-zinc-400">Next: {response.payload.suggestedNextActions.join(" / ")}</p> : null}
                        {response.payload?.rulesEngineNotes?.length ? <p className="mt-2 text-xs leading-5 text-zinc-500">Rules: {response.payload.rulesEngineNotes.join(" / ")}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>

                <form className="mt-3 grid gap-2" onSubmit={sendMessage}>
                  <textarea
                    className="min-h-24 rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-mana/50"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask for a character idea, spell draft, item, NPC, monster, quest, map, compendium help, or rule explanation..."
                  />
                  <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">Send to assistant</button>
                  {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
                </form>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

