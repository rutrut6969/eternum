import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/campaigns/activity-feed";
import { MemberRoleEditor } from "@/components/campaigns/member-role-editor";
import { NotesPanel } from "@/components/campaigns/notes-panel";
import { SessionManager } from "@/components/campaigns/session-manager";
import { TimelineView } from "@/components/campaigns/timeline-view";
import { VttFoundationPanel } from "@/components/campaigns/vtt-foundation-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { buildCampaignTimeline } from "@/lib/timeline";

export default async function CampaignDashboardPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireUser();
  const { campaignId } = await params;

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } }
  });
  if (!membership) notFound();

  const isDm = hasDmPermission(membership.roles);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      characters: { include: { owner: { select: { name: true, username: true } }, milestones: { orderBy: { createdAt: "desc" }, take: 5 } } },
      campaignSessions: { where: { status: { not: "ARCHIVED" } }, orderBy: { sessionNumber: "desc" } },
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
        take: 30
      },
      activityLogs: { include: { actor: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 40 },
      homebrew: { where: { status: "PENDING_DM_REVIEW" }, orderBy: { updatedAt: "desc" }, take: 10 },
      maps: { include: { layers: true, tokens: true, encounters: true }, orderBy: { updatedAt: "desc" } }
    }
  });
  if (!campaign) notFound();

  const activeSession = campaign.campaignSessions.find((session) => session.status === "ACTIVE");
  const timeline = buildCampaignTimeline({
    sessions: campaign.campaignSessions,
    notes: campaign.campaignNotes,
    activities: campaign.activityLogs,
    milestones: campaign.characters.flatMap((character) => character.milestones)
  });

  const sessions = campaign.campaignSessions.map((session) => ({
    id: session.id,
    title: session.title,
    description: session.description,
    sessionNumber: session.sessionNumber,
    status: session.status,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null
  }));
  const notes = campaign.campaignNotes.map((note) => ({
    id: note.id,
    title: note.title,
    body: note.body,
    visibility: note.visibility,
    createdAt: note.createdAt.toISOString(),
    author: note.author,
    character: note.character
  }));
  const activities = campaign.activityLogs.map((activity) => ({
    id: activity.id,
    type: activity.type,
    metadata: activity.metadata,
    createdAt: activity.createdAt.toISOString(),
    actor: activity.actor
  }));
  const maps = campaign.maps.map((map) => ({
    id: map.id,
    name: map.name,
    width: map.width,
    height: map.height,
    layers: map.layers,
    tokens: map.tokens,
    encounters: map.encounters
  }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Link href="/dashboard/campaigns" className="text-sm text-mana">Back to campaigns</Link>
      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone={isDm ? "gold" : "mana"}>{membership.roles.join(", ")}</Badge>
          <h1 className="mt-4 text-4xl font-black text-white md:text-6xl">{campaign.name}</h1>
          {campaign.description ? <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">{campaign.description}</p> : null}
        </div>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Active session</h2>
          {activeSession ? (
            <div className="mt-4">
              <Badge tone="stamina">Session #{activeSession.sessionNumber}</Badge>
              <h3 className="mt-3 text-xl font-bold text-white">{activeSession.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{activeSession.description || "No description yet."}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-300">No active session. A DM can start one from the session history.</p>
          )}
        </Card>
        <ActivityFeed activities={activities.slice(0, 6)} />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <SessionManager campaignId={campaign.id} sessions={sessions} canManage={isDm} />
        <Card>
          <h2 className="text-2xl font-bold text-white">Characters</h2>
          <div className="mt-5 grid gap-3">
            {campaign.characters.map((character) => (
              <div key={character.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <h3 className="font-bold text-white">{character.name}</h3>
                <p className="text-sm text-zinc-400">Player: {character.owner.name || character.owner.username}</p>
                <p className="mt-2 text-xs text-zinc-500">{character.milestones.length} recent milestones</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <NotesPanel
          campaignId={campaign.id}
          notes={notes}
          sessions={sessions.map((session) => ({ id: session.id, title: session.title }))}
          characters={campaign.characters.map((character) => ({ id: character.id, name: character.name }))}
          canDm={isDm}
        />
        <div className="grid gap-5">
          <Card>
            <h2 className="text-2xl font-bold text-white">Homebrew awaiting approval</h2>
            <div className="mt-5 grid gap-3">
              {campaign.homebrew.length === 0 ? <p className="text-sm text-zinc-300">No pending homebrew.</p> : null}
              {campaign.homebrew.map((item) => (
                <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <Badge tone="violet">{item.type.replace(/_/g, " ")}</Badge>
                  <h3 className="mt-2 font-bold text-white">{item.title}</h3>
                </div>
              ))}
            </div>
          </Card>
          {isDm ? <MemberRoleEditor campaignId={campaign.id} members={campaign.members} /> : null}
        </div>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <TimelineView events={timeline.slice(0, 30)} />
        <VttFoundationPanel campaignId={campaign.id} maps={maps} canManage={isDm} />
      </section>
    </main>
  );
}
