import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const workflows = [
  "Character creation and backstory help",
  "Spell drafting and spellcraft questions",
  "Item drafting and crafting concepts",
  "NPC, monster, and quest planning placeholders",
  "Map blueprint planning",
  "Eternum rules explanations",
  "Compendium and marketplace planning help"
];

export default async function AssistantWorkspacePage() {
  const user = await requireUser();
  const threads = await prisma.assistantThread.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      campaign: { select: { name: true } },
      character: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      workflows: { orderBy: { updatedAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" },
    take: 12
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">Unified AI</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Eternum assistant</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        A persistent assistant foundation for character ideas, spells, items, NPCs, monsters, quests, maps, compendiums, and rules explanations.
        Suggestions stay advisory until the rules engine and DM approval flow make them usable.
      </p>

      <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Workflow router</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Use the floating Eternum AI button from any dashboard page. The assistant classifies your request, stores the thread, and creates draft workflow state.
          </p>
          <div className="mt-5 grid gap-2">
            {workflows.map((workflow) => (
              <div key={workflow} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                {workflow}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Recent threads</h2>
          {threads.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-zinc-300">No assistant threads yet. Open the floating assistant and ask for a rule explanation, spell idea, item draft, NPC, monster, quest, or map blueprint.</p>
          ) : (
            <div className="mt-5 grid gap-3">
              {threads.map((thread) => (
                <article key={thread.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="violet">{thread.workflows[0]?.type.replace(/_/g, " ").toLowerCase() ?? "assistant"}</Badge>
                    {thread.campaign ? <Badge tone="gold">{thread.campaign.name}</Badge> : null}
                    {thread.character ? <Badge tone="stamina">{thread.character.name}</Badge> : null}
                  </div>
                  <h3 className="mt-3 font-bold text-white">{thread.title}</h3>
                  {thread.messages[0] ? <p className="mt-2 text-sm leading-6 text-zinc-400">{thread.messages[0].content}</p> : null}
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <h2 className="text-xl font-bold text-white">Architecture guardrail</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            AI Suggestion - Rules Engine Calculation - DM Approval - Saved Content. The assistant can draft and organize, but it cannot finalize mechanics, bypass approvals, or publish content by itself.
          </p>
        </Card>
      </section>
    </main>
  );
}

