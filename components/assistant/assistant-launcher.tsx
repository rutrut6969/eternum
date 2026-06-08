"use client";

import { useEffect, useMemo, useState } from "react";

type ThreadSummary = {
  id: string;
  title: string;
  campaign?: { name: string } | null;
  character?: { name: string } | null;
  messages?: { content: string; role: string; createdAt: string }[];
  workflows?: { type: string; status: string }[];
};

type AssistantResponse = {
  threadId: string;
  intent?: { type: string; label: string };
  warning?: string;
  payload?: {
    summary?: string;
    questions?: string[];
    suggestedNextActions?: string[];
    rulesEngineNotes?: string[];
    dmApprovalRequired?: boolean;
    structuredDraft?: Record<string, unknown>;
  };
  error?: string;
};

const quickActions = [
  "Create Character",
  "Create NPC",
  "Create Monster",
  "Create Spell",
  "Create Item",
  "Create Quest",
  "Create Map",
  "Summarize Session",
  "Explain Rules",
  "Split Loot",
  "Build Compendium"
];

const maxWarningLength = 12000;

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [responses, setResponses] = useState<AssistantResponse[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(true);

  const activeThread = useMemo(() => threads.find((thread) => thread.id === activeThreadId), [threads, activeThreadId]);
  const largeMessage = message.length > maxWarningLength;

  useEffect(() => {
    if (!open) return;
    fetch("/api/assistant/threads")
      .then((response) => response.json())
      .then((body) => setThreads(body.threads ?? []))
      .catch(() => setThreads([]));
  }, [open, responses.length]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function startPrompt(action: string) {
    setMessage(`${action}: `);
    setShowShortcuts(false);
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus("Routing request through Eternum AI...");
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
    setResponses((current) => [body, ...current].slice(0, 12));
    setMessage("");
    setStatus(body.warning || "");
  }

  return (
    <>
      <button
        aria-label="Open Eternum AI assistant"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 rounded-full border border-mana/40 bg-[#07111f] px-4 py-3 text-sm font-bold text-mana shadow-lg shadow-black/30 hover:bg-mana/10"
        onClick={() => setOpen(true)}
        type="button"
      >
        Eternum AI
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70]">
          <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Close assistant" onClick={() => setOpen(false)} type="button" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-6xl flex-col border-l border-mana/20 bg-[#07070c] shadow-2xl shadow-black/50 lg:w-[min(94vw,1120px)]">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mana">Campaign operating system</p>
                <h2 className="mt-2 text-2xl font-black text-white">Eternum AI Assistant</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Draft, route, and organize ideas. Rules-engine math and DM approval still decide what becomes real.</p>
              </div>
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5" onClick={() => setOpen(false)} type="button">Close</button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
              <aside className="min-h-0 border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
                <button className="w-full rounded-md bg-aureate px-3 py-3 text-sm font-semibold text-void" onClick={() => { setActiveThreadId(undefined); setResponses([]); }} type="button">
                  New thread
                </button>
                <div className="mt-3 max-h-40 overflow-auto lg:max-h-[34dvh]">
                  {threads.length === 0 ? <p className="rounded-md border border-dashed border-white/10 p-3 text-xs leading-5 text-zinc-500">No saved assistant threads yet.</p> : null}
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      className={`mb-2 w-full rounded-md border px-3 py-2 text-left text-xs ${activeThreadId === thread.id ? "border-mana/40 bg-mana/10 text-mana" : "border-white/10 bg-white/[0.03] text-zinc-300"}`}
                      onClick={() => setActiveThreadId(thread.id)}
                      type="button"
                    >
                      <span className="block truncate font-semibold">{thread.title}</span>
                      <span className="mt-1 block truncate text-zinc-500">{thread.workflows?.[0]?.type?.replace(/_/g, " ").toLowerCase() ?? "assistant"}</span>
                    </button>
                  ))}
                </div>

                <button className="mt-3 w-full rounded-md border border-white/10 px-3 py-2 text-left text-sm font-semibold text-zinc-200 lg:hidden" onClick={() => setShowShortcuts((value) => !value)} type="button">
                  Workflow shortcuts
                </button>
                <div className={`${showShortcuts ? "grid" : "hidden"} mt-3 gap-2 lg:grid`}>
                  {quickActions.map((action) => (
                    <button key={action} className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:border-mana/30 hover:text-white" onClick={() => startPrompt(action)} type="button">
                      {action}
                    </button>
                  ))}
                </div>
              </aside>

              <section className="flex min-h-0 flex-col p-3 sm:p-4">
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
                  {responses.length === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 p-4">
                      <p className="font-semibold text-white">What should Eternum help build?</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">Try a classless character concept, NPC roleplay draft, monster idea, spell, item, map blueprint, loot split, session summary, or rules question.</p>
                    </div>
                  ) : null}
                  <div className="grid gap-3">
                    {responses.map((response, index) => (
                      <article key={`${response.threadId}-${index}`} className="rounded-lg border border-white/10 bg-[#0d0d14] p-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-mana/30 bg-mana/10 px-2 py-1 text-xs font-semibold text-mana">{response.intent?.label ?? "Assistant"}</span>
                          {response.payload?.dmApprovalRequired ? <span className="rounded-full border border-aureate/30 bg-aureate/10 px-2 py-1 text-xs font-semibold text-aureate">DM approval</span> : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-100">{response.payload?.summary ?? response.error ?? "Assistant response saved."}</p>
                        {response.warning ? <p className="mt-3 rounded-md border border-aureate/20 bg-aureate/10 p-2 text-xs text-aureate">{response.warning}</p> : null}
                        {response.payload?.questions?.length ? <p className="mt-3 text-xs leading-5 text-zinc-400">Questions: {response.payload.questions.join(" / ")}</p> : null}
                        {response.payload?.suggestedNextActions?.length ? <p className="mt-2 text-xs leading-5 text-zinc-400">Next: {response.payload.suggestedNextActions.join(" / ")}</p> : null}
                        {response.payload?.rulesEngineNotes?.length ? <p className="mt-2 text-xs leading-5 text-zinc-500">Rules: {response.payload.rulesEngineNotes.join(" / ")}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>

                <form className="sticky bottom-0 mt-3 grid gap-2 bg-[#07070c] pb-[max(0.25rem,env(safe-area-inset-bottom))]" onSubmit={sendMessage}>
                  <textarea
                    className="min-h-28 rounded-md border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-mana/50"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask for a character, NPC, monster, spell, item, quest, map, compendium, rules answer, loot split, or session summary..."
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className={`text-xs ${largeMessage ? "text-aureate" : "text-zinc-500"}`}>
                      {message.length.toLocaleString()} chars{largeMessage ? " - large text will be condensed for AI and preserved in the thread" : ""}
                    </p>
                    <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">Send to assistant</button>
                  </div>
                  {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
                </form>
              </section>

              <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 p-4 lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Context</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">Active thread</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{activeThread?.title ?? "New unsaved thread"}</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">Campaign</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{activeThread?.campaign?.name ?? "No campaign context selected"}</p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-semibold text-white">Character</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{activeThread?.character?.name ?? "No character context selected"}</p>
                  </div>
                  <div className="rounded-md border border-aureate/15 bg-aureate/10 p-3">
                    <p className="text-sm font-semibold text-aureate">Guardrail</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-300">AI Suggestion - Rules Engine Calculation - DM Approval - Saved Content.</p>
                  </div>
                </div>
              </aside>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
