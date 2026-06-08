import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/campaigns/activity-feed";
import { VttFoundationPanel } from "@/components/campaigns/vtt-foundation-panel";
import { DiceRoller } from "@/components/dice/dice-roller";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

export default async function CampaignPlayPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireUser();
  const { campaignId } = await params;
  const isFounder = await subscriptionService.isFounder(user.id);
  const membership = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: user.id } } });
  if (!membership && !isFounder) notFound();

  const roles = membership?.roles ?? (isFounder ? (["DM", "PLAYER"] as const) : []);
  const isDm = isFounder || hasDmPermission([...roles]);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSessions: { where: { status: { not: "ARCHIVED" } }, orderBy: { sessionNumber: "desc" } },
      characters: { include: { owner: { select: { name: true, username: true } } } },
      activityLogs: { include: { actor: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 15 },
      campaignNotes: {
        where: {
          OR: [
            { visibility: "CAMPAIGN_SHARED" },
            ...(isDm ? [{ visibility: "DM_ONLY" as const }] : []),
            { visibility: "CHARACTER_PRIVATE", character: { ownerId: user.id } },
            { authorId: user.id }
          ]
        },
        include: { author: { select: { name: true, username: true } }, character: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      },
      maps: { include: { images: true, tags: true, layers: true, tokens: true, encounters: true }, orderBy: { updatedAt: "desc" } }
    }
  });
  if (!campaign) notFound();

  const activeSession = campaign.campaignSessions.find((session) => session.status === "ACTIVE");
  const sessions = campaign.campaignSessions.map((session) => ({ id: session.id, title: session.title }));
  const maps = campaign.maps.map((map) => ({
    id: map.id,
    name: map.name,
    description: map.description,
    width: map.width,
    height: map.height,
    gridType: map.gridType,
    approvalStatus: map.approvalStatus,
    visibility: map.visibility,
    sessionTitle: campaign.campaignSessions.find((session) => session.id === map.sessionId)?.title ?? null,
    images: map.images,
    tags: map.tags,
    layers: map.layers,
    tokens: map.tokens,
    encounters: map.encounters
  }));
  const campaignOption = [{ id: campaign.id, name: campaign.name, roles: [...roles] }];
  const characterOptions = campaign.characters.map((character) => ({ id: character.id, name: character.name, campaignId: character.campaignId }));
  const activities = campaign.activityLogs.map((activity) => ({
    id: activity.id,
    type: activity.type,
    metadata: activity.metadata,
    createdAt: activity.createdAt.toISOString(),
    actor: activity.actor
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-mana">Back to manager</Link>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={activeSession ? "stamina" : "mana"}>{activeSession ? "Session live" : "No active session"}</Badge>
            <Badge tone={isDm ? "gold" : "violet"}>{isDm ? "DM controls" : "Player mode"}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">Play {campaign.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Live tabletop foundation for maps, dice, character tools, notes, handouts, session feed, tokens, and future combat automation.</p>
        </div>
      </div>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <VttFoundationPanel campaignId={campaign.id} maps={maps} sessions={sessions} canManage={isDm} />
        <div className="grid gap-5">
          <Card>
            <h2 className="text-2xl font-bold text-white">Live session</h2>
            {activeSession ? (
              <div className="mt-4">
                <Badge tone="stamina">Session #{activeSession.sessionNumber}</Badge>
                <h3 className="mt-3 text-xl font-bold text-white">{activeSession.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{activeSession.description || "No session description yet."}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-300">A DM can start a session from the campaign manager. Players can still prep sheets, notes, and rolls here.</p>
            )}
          </Card>
          <Card>
            <h2 className="text-2xl font-bold text-white">Characters</h2>
            <div className="mt-4 max-h-72 overflow-y-auto pr-1">
              {campaign.characters.length === 0 ? <p className="text-sm text-zinc-300">No characters are attached yet.</p> : null}
              {campaign.characters.map((character) => (
                <div key={character.id} className="mb-3 rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="font-bold text-white">{character.name}</p>
                  <p className="text-xs text-zinc-500">{character.owner.name || character.owner.username}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <DiceRoller campaigns={campaignOption} characters={characterOptions} />
        <div className="grid gap-5">
          <ActivityFeed activities={activities} title="Session activity" />
          <Card>
            <h2 className="text-2xl font-bold text-white">Notes and handouts</h2>
            <div className="mt-4 max-h-80 overflow-y-auto pr-1">
              {campaign.campaignNotes.length === 0 ? <p className="text-sm text-zinc-300">No visible notes or handouts yet.</p> : null}
              {campaign.campaignNotes.map((note) => (
                <div key={note.id} className="mb-3 rounded-md border border-white/10 bg-black/25 p-3">
                  <Badge tone={note.visibility === "DM_ONLY" ? "crimson" : "mana"}>{note.visibility.replace(/_/g, " ")}</Badge>
                  <h3 className="mt-2 font-bold text-white">{note.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm text-zinc-300">{note.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
