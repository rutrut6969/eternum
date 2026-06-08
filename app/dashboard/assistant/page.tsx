import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const workflowGroups = [
  {
    title: "Creation",
    items: ["Classless character", "NPC profile", "Monster draft", "Spellcraft", "Item craft", "Quest hook", "Editable map blueprint"]
  },
  {
    title: "Campaign Ops",
    items: ["Session summary", "Campaign memory query", "Rules explanation", "Worldbuilding", "Compendium planning"]
  },
  {
    title: "Table State",
    items: ["Loot tracking", "Currency split", "Crafted item pricing", "Listener transcript review", "NPC roleplay draft"]
  }
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
      <h1 className="mt-5 text-3xl font-black text-white sm:text-5xl">Eternum operating system</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        The assistant is a persistent campaign intelligence layer for creation, session memory, rules help, NPC roleplay drafts, map blueprints, loot, and compendium planning.
        Use the floating assistant button anywhere in the dashboard to open the full panel.
      </p>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {workflowGroups.map((group) => (
          <Card key={group.title}>
            <h2 className="text-2xl font-bold text-white">{group.title}</h2>
            <div className="mt-5 grid gap-2">
              {group.items.map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Workflow standards</h2>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-zinc-300">
            <p>Long backstories, session notes, lore, and compendium text are preserved in the thread while condensed before being sent to AI.</p>
            <p>NPC roleplay responses are draft-first. The DM can approve, edit, preview privately, auto-send low-risk responses later, or disable roleplay.</p>
            <p>Loot, currency, memory, and inventory updates become pending records. They do not apply automatically.</p>
            <p>Pricing, mana, stamina, difficulty, DCs, and balance remain rules-engine work, not AI decisions.</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-white">Recent threads</h2>
          {threads.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-zinc-300">No assistant threads yet. Ask for a character, NPC, monster, spell, item, quest, map, compendium, loot split, memory query, or rule explanation.</p>
          ) : (
            <div className="mt-5 max-h-[32rem] overflow-y-auto pr-1">
              {threads.map((thread) => (
                <article key={thread.id} className="mb-3 rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="violet">{thread.workflows[0]?.type.replace(/_/g, " ").toLowerCase() ?? "assistant"}</Badge>
                    {thread.campaign ? <Badge tone="gold">{thread.campaign.name}</Badge> : null}
                    {thread.character ? <Badge tone="stamina">{thread.character.name}</Badge> : null}
                  </div>
                  <h3 className="mt-3 font-bold text-white">{thread.title}</h3>
                  {thread.messages[0] ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{thread.messages[0].content}</p> : null}
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
            AI Suggestion - Rules Engine Calculation - DM Approval - Saved Content. The assistant drafts and routes ideas; it cannot finalize mechanics, bypass approvals, publish content, or apply inventory/currency changes by itself.
          </p>
        </Card>
      </section>
    </main>
  );
}
