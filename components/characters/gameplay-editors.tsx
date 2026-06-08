"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { professions } from "@/lib/rules/professions";
import { magicDisciplines } from "@/lib/rules/disciplines";

type GameplayField =
  | "inventory"
  | "learnedSpells"
  | "customSpells"
  | "craftedItems"
  | "disciplines"
  | "traits"
  | "flaws"
  | "affinities"
  | "tamedCreatures"
  | "undeadServants";

type CharacterGameplay = {
  id: string;
  campaignId: string | null;
  inventory: unknown[];
  learnedSpells: unknown[];
  customSpells: unknown[];
  craftedItems: unknown[];
  disciplines: unknown[];
  traits: unknown[];
  flaws: unknown[];
  affinities: unknown[];
  tamedCreatures: unknown[];
  undeadServants: unknown[];
  professionLevels: Array<{ profession: string; level: number; xp: number }>;
  backstoryAnalyses?: Array<{ id: string; status: string; dmNotes: string | null; createdAt: string; reviewedAt: string | null }>;
  submissions?: CharacterSubmission[];
};

type CharacterSubmission = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  rarity: string | null;
  discipline: string | null;
  body: unknown;
  rulesResult: unknown;
  generatedByAi: boolean;
  campaignId: string | null;
  campaignName: string | null;
  characterId: string | null;
  characterName: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  dmFeedback: string | null;
  updatedAt: string;
  currentRevisionId: string | null;
  currentRevisionNumber: number | null;
  revisions: Array<{
    id: string;
    revisionNumber: number;
    submittedAt: string;
    dmFeedback: string | null;
    dmDecision: string | null;
    reviewedAt: string | null;
    reviewedByName: string | null;
  }>;
};

const editorFields: Array<{ field: GameplayField; label: string; placeholder: string }> = [
  { field: "inventory", label: "Inventory", placeholder: "Item name" },
  { field: "learnedSpells", label: "Learned Spells", placeholder: "Spell name" },
  { field: "customSpells", label: "Custom Spells", placeholder: "Custom spell name" },
  { field: "craftedItems", label: "Crafted Items", placeholder: "Crafted item name" },
  { field: "disciplines", label: "Magical Disciplines", placeholder: "Discipline" },
  { field: "traits", label: "Traits", placeholder: "Trait" },
  { field: "flaws", label: "Flaws", placeholder: "Flaw" },
  { field: "affinities", label: "Affinities", placeholder: "Affinity" },
  { field: "tamedCreatures", label: "Tamed Creatures", placeholder: "Creature" },
  { field: "undeadServants", label: "Undead Servants", placeholder: "Undead servant" }
];

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { name: String(value ?? "") };
}

function titleOf(value: unknown) {
  const record = toRecord(value);
  return String(record.name ?? record.title ?? record.profession ?? "Untitled");
}

function summaryOf(value: unknown) {
  const record = toRecord(value);
  return String(record.description ?? record.summary ?? record.source ?? record.rarity ?? "");
}

function imageOf(value: unknown) {
  const record = toRecord(value);
  return typeof record.imageUrl === "string" ? record.imageUrl : "";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_DM_REVIEW: "Pending Approval",
    NEEDS_CHANGES: "Needs Revision",
    REJECTED: "Denied",
    APPROVED_PRIVATE: "Approved",
    APPROVED_PUBLIC: "Approved Public",
    ARCHIVED: "Archived"
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function statusTone(status: string): "gold" | "mana" | "violet" | "stamina" | "crimson" {
  if (status === "APPROVED_PRIVATE" || status === "APPROVED_PUBLIC") return "stamina";
  if (status === "PENDING_DM_REVIEW") return "gold";
  if (status === "NEEDS_CHANGES") return "mana";
  if (status === "REJECTED") return "crimson";
  return "violet";
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function bodyRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isCraftedSubmission(submission: CharacterSubmission) {
  const body = bodyRecord(submission.body);
  return submission.type === "CRAFTING_RECIPE" || body.source === "crafted" || Boolean(body.craftingRequirements) || Boolean(body.materials);
}

function submissionsForField(field: GameplayField, submissions: CharacterSubmission[]) {
  return submissions.filter((submission) => {
    if (field === "customSpells") return submission.type === "CUSTOM_SPELL";
    if (field === "inventory") return submission.type === "CUSTOM_ITEM" && !isCraftedSubmission(submission);
    if (field === "craftedItems") return (submission.type === "CUSTOM_ITEM" && isCraftedSubmission(submission)) || submission.type === "CRAFTING_RECIPE";
    if (field === "traits" || field === "flaws" || field === "affinities") return submission.type === "PROFESSION_PERK" || submission.type === "MAGICAL_DISCIPLINE";
    if (field === "undeadServants" || field === "tamedCreatures") return submission.type === "MONSTER_NPC";
    return false;
  });
}

function SubmissionStatusCard({ submission, onSaved }: { submission: CharacterSubmission; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(submission.title);
  const [summary, setSummary] = useState(submission.summary ?? "");
  const [bodyText, setBodyText] = useState(JSON.stringify(submission.body ?? {}, null, 2));
  const [message, setMessage] = useState<string | null>(null);
  const canRevise = submission.status === "NEEDS_CHANGES" || submission.status === "REJECTED" || submission.status === "DRAFT";

  async function resubmit() {
    setMessage(null);
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      setMessage("Body must be valid JSON before resubmitting.");
      return;
    }
    const response = await fetch(`/api/homebrew/${submission.id}/resubmit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary,
        body: parsedBody,
        rarity: submission.rarity ?? undefined,
        discipline: submission.discipline ?? undefined
      })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || "Could not resubmit.");
      return;
    }
    setMessage("Submitted for DM Approval.");
    setEditing(false);
    onSaved();
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(submission.status)}>{statusLabel(submission.status)}</Badge>
            <Badge tone="violet">Revision {submission.currentRevisionNumber ?? 1}</Badge>
            {submission.generatedByAi ? <Badge tone="mana">AI draft</Badge> : null}
          </div>
          <h4 className="mt-2 font-semibold text-white">{submission.title}</h4>
          <p className="mt-1 text-xs text-zinc-500">
            {submission.campaignName || "Private"} / {submission.characterName || "No character"} / Submitted {formatDate(submission.submittedAt)} / Updated {formatDate(submission.updatedAt)}
          </p>
          {submission.summary ? <p className="mt-2 text-sm text-zinc-300">{submission.summary}</p> : null}
        </div>
        <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-200" onClick={() => setOpen((value) => !value)} type="button">
          {open ? "Hide details" : "View status"}
        </button>
      </div>
      {open ? (
        <div className="mt-3 grid gap-3">
          {submission.dmFeedback ? (
            <div className="rounded-md border border-aureate/20 bg-aureate/10 p-3 text-sm text-aureate">
              <p className="font-semibold">{statusLabel(submission.status)}{submission.reviewedByName ? ` by ${submission.reviewedByName}` : ""}</p>
              <p className="mt-1 leading-6">{submission.dmFeedback}</p>
              <p className="mt-2 text-xs text-aureate/75">Reviewed {formatDate(submission.reviewedAt)}</p>
            </div>
          ) : (
            <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">No DM feedback yet.</p>
          )}
          <details className="rounded-md border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Revision history</summary>
            <div className="mt-3 grid gap-2">
              {submission.revisions.map((revision) => (
                <div key={revision.id} className="rounded border border-white/10 bg-black/25 p-2 text-xs text-zinc-300">
                  <p className="font-semibold text-white">Revision {revision.revisionNumber} / Submitted {formatDate(revision.submittedAt)}</p>
                  {revision.dmDecision ? <p className="mt-1">{statusLabel(revision.dmDecision)} / {revision.reviewedByName || "DM"} / {formatDate(revision.reviewedAt)}</p> : null}
                  {revision.dmFeedback ? <p className="mt-1 text-aureate">{revision.dmFeedback}</p> : null}
                </div>
              ))}
            </div>
          </details>
          <div className="grid gap-3 lg:grid-cols-2">
            <pre className="max-h-52 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(submission.body, null, 2)}</pre>
            <pre className="max-h-52 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(submission.rulesResult, null, 2)}</pre>
          </div>
          {canRevise ? (
            <div className="rounded-md border border-mana/20 bg-mana/10 p-3">
              <button className="rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana" onClick={() => setEditing((value) => !value)} type="button">
                {editing ? "Cancel revision" : "Revise and resubmit"}
              </button>
              {editing ? (
                <div className="mt-3 grid gap-2">
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={title} onChange={(event) => setTitle(event.target.value)} />
                  <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 p-3 text-white" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Summary" />
                  <textarea className="min-h-48 rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs text-white" value={bodyText} onChange={(event) => setBodyText(event.target.value)} />
                  {message ? <p className="rounded-md border border-white/10 bg-black/25 p-2 text-sm text-mana">{message}</p> : null}
                  <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={resubmit} type="button">Submit revised version</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GameplayEditors({ character }: { character: CharacterGameplay }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [spellSearch, setSpellSearch] = useState("");
  const [spellResults, setSpellResults] = useState<Array<Record<string, unknown>>>([]);
  const [professionDraft, setProfessionDraft] = useState<{ profession: string; level: string; xp: string }>({ profession: professions[0], level: "1", xp: "0" });
  const [message, setMessage] = useState<string | null>(null);

  async function patchGameplay(field: GameplayField, action: "add" | "remove", value?: unknown, index?: number) {
    const response = await fetch(`/api/characters/${character.id}/gameplay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, action, value, index })
    });
    if (!response.ok) {
      setMessage("Could not update character data.");
      return;
    }
    setMessage("Character data updated.");
    router.refresh();
  }

  function draftFor(field: GameplayField, key: string) {
    return drafts[field]?.[key] ?? "";
  }

  function setDraft(field: GameplayField, key: string, value: string) {
    setDrafts((current) => ({ ...current, [field]: { ...(current[field] ?? {}), [key]: value } }));
  }

  async function addFieldItem(field: GameplayField) {
    const name = draftFor(field, "name");
    if (!name) return;
    const value =
      field === "inventory"
        ? {
            name,
            type: draftFor(field, "type") || "Gear",
            rarity: draftFor(field, "rarity") || "common",
            quantity: Number(draftFor(field, "quantity") || 1),
            description: draftFor(field, "description"),
            equipped: draftFor(field, "equipped") === "true",
            imageUrl: draftFor(field, "imageUrl"),
            source: draftFor(field, "source") || "awarded"
          }
        : { name, description: draftFor(field, "description"), source: "manual" };
    await patchGameplay(field, "add", value);
    setDrafts((current) => ({ ...current, [field]: {} }));
  }

  async function searchSpells() {
    const response = await fetch(`/api/srd/spells?search=${encodeURIComponent(spellSearch)}`);
    if (!response.ok) {
      setMessage("Could not search SRD spells.");
      return;
    }
    const body = (await response.json()) as { spells: Array<Record<string, unknown>> };
    setSpellResults(body.spells);
  }

  async function saveProfession() {
    const response = await fetch(`/api/characters/${character.id}/professions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profession: professionDraft.profession,
        level: Number(professionDraft.level || 0),
        xp: Number(professionDraft.xp || 0)
      })
    });
    if (!response.ok) {
      setMessage("Could not update profession.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-5">
      {message ? <p className="rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}

      <Card>
        <h3 className="text-xl font-bold text-white">Learn SRD spell</h3>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana" value={spellSearch} onChange={(event) => setSpellSearch(event.target.value)} placeholder="Search Open5e spells" />
          <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={searchSpells} type="button">Search</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {spellResults.map((spell, index) => (
            <div key={`${spell.name}-${index}`} className="rounded-md border border-mana/20 bg-mana/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-white">{String(spell.name)}</p>
                  <p className="text-sm text-zinc-300">Tier {String(spell.tier)} - {String(spell.manaCost)} mana - {String(spell.castingTime)}</p>
                </div>
                <button className="rounded-md border border-mana/30 px-3 py-2 text-sm text-mana" onClick={() => patchGameplay("learnedSpells", "add", spell)} type="button">Learn</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold text-white">Profession Progress</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.4fr_0.4fr_auto]">
          <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.profession} onChange={(event) => setProfessionDraft((current) => ({ ...current, profession: event.target.value }))}>
            {professions.map((profession) => <option key={profession} value={profession}>{profession}</option>)}
          </select>
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.level} onChange={(event) => setProfessionDraft((current) => ({ ...current, level: event.target.value }))} placeholder="Level" />
          <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={professionDraft.xp} onChange={(event) => setProfessionDraft((current) => ({ ...current, xp: event.target.value }))} placeholder="XP" />
          <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void" onClick={saveProfession} type="button">Save</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {character.professionLevels.map((profession) => (
            <Badge key={profession.profession} tone="gold">{profession.profession} {profession.level}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Backstory / Character Development</h3>
            <p className="mt-1 text-sm text-zinc-400">AI backstory suggestions and DM feedback stay visible here.</p>
          </div>
          <Badge tone="violet">{character.backstoryAnalyses?.length ?? 0}</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {character.backstoryAnalyses?.length ? null : <p className="text-sm text-zinc-400">No backstory suggestions submitted yet.</p>}
          {character.backstoryAnalyses?.map((analysis) => (
            <div key={analysis.id} className="rounded-md border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(analysis.status)}>{statusLabel(analysis.status)}</Badge>
                <Badge tone="violet">Submitted {formatDate(analysis.createdAt)}</Badge>
              </div>
              {analysis.dmNotes ? (
                <p className="mt-3 rounded-md border border-aureate/20 bg-aureate/10 p-3 text-sm leading-6 text-aureate">{analysis.dmNotes}</p>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No DM feedback yet.</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">Reviewed {formatDate(analysis.reviewedAt)}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {editorFields.map(({ field, label, placeholder }) => (
          <Card key={field}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-white">{label}</h3>
              <Badge tone="violet">{character[field].length}</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-mana" value={draftFor(field, "name")} onChange={(event) => setDraft(field, "name", event.target.value)} placeholder={placeholder} />
              {field === "inventory" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "type")} onChange={(event) => setDraft(field, "type", event.target.value)} placeholder="Type" />
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "rarity")} onChange={(event) => setDraft(field, "rarity", event.target.value)} placeholder="Rarity" />
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "quantity")} onChange={(event) => setDraft(field, "quantity", event.target.value)} placeholder="Quantity" />
                  <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "source")} onChange={(event) => setDraft(field, "source", event.target.value)}>
                    <option value="awarded">Awarded</option>
                    <option value="crafted">Crafted</option>
                    <option value="imported">Imported</option>
                    <option value="homebrew">Homebrew</option>
                  </select>
                  <input className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white sm:col-span-2" value={draftFor(field, "imageUrl")} onChange={(event) => setDraft(field, "imageUrl", event.target.value)} placeholder="Image URL" />
                </div>
              ) : null}
              {field === "disciplines" ? (
                <select className="rounded-md border border-white/10 bg-black/30 px-3 py-3 text-white" value={draftFor(field, "name")} onChange={(event) => setDraft(field, "name", event.target.value)}>
                  <option value="">Choose discipline</option>
                  {magicDisciplines.map((discipline) => <option key={discipline} value={discipline}>{discipline}</option>)}
                </select>
              ) : null}
              <textarea className="min-h-20 rounded-md border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-mana" value={draftFor(field, "description")} onChange={(event) => setDraft(field, "description", event.target.value)} placeholder="Description or notes" />
              <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={() => addFieldItem(field)} type="button">Add</button>
            </div>
            <div className="mt-4 grid gap-2">
              {character[field].map((item, index) => (
                <div key={`${field}-${index}`} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {imageOf(item) ? <img className="mb-3 aspect-video w-full rounded-md object-cover" src={imageOf(item)} alt={titleOf(item)} /> : null}
                      <p className="font-semibold text-white">{titleOf(item)}</p>
                      {summaryOf(item) ? <p className="mt-1 text-sm text-zinc-400">{summaryOf(item)}</p> : null}
                    </div>
                    <button className="rounded-md border border-crimson/30 px-3 py-2 text-sm text-crimson" onClick={() => patchGameplay(field, "remove", undefined, index)} type="button">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {submissionsForField(field, character.submissions ?? []).length ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-white">
                      {field === "customSpells" ? "Spell Submissions" : field === "inventory" ? "Item Submissions" : field === "craftedItems" ? "Crafting Submission History" : "Character Development Submissions"}
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500">Submitted content remains visible through approval, denial, edits, and final use.</p>
                  </div>
                  <Badge tone="gold">{submissionsForField(field, character.submissions ?? []).length}</Badge>
                </div>
                <div className="grid gap-3">
                  {submissionsForField(field, character.submissions ?? []).map((submission) => (
                    <SubmissionStatusCard key={submission.id} submission={submission} onSaved={() => router.refresh()} />
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
