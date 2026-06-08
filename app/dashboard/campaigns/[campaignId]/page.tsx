import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/campaigns/activity-feed";
import { CampaignInvitesPanel } from "@/components/campaigns/campaign-invites-panel";
import { CampaignSettingsPanel } from "@/components/campaigns/campaign-settings-panel";
import { MemberRoleEditor } from "@/components/campaigns/member-role-editor";
import { NotesPanel } from "@/components/campaigns/notes-panel";
import { SessionManager } from "@/components/campaigns/session-manager";
import { TimelineView } from "@/components/campaigns/timeline-view";
import { VttFoundationPanel } from "@/components/campaigns/vtt-foundation-panel";
import { DiceRoller } from "@/components/dice/dice-roller";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";
import { buildCampaignTimeline } from "@/lib/timeline";

const tabs = [
  ["#overview", "Overview"],
  ["#sessions", "Sessions"],
  ["#characters", "Characters"],
  ["#members", "Members"],
  ["#invites", "Invites"],
  ["#approvals", "Approvals"],
  ["#dice", "Dice Rolls"],
  ["#notes", "Notes"],
  ["#maps", "Maps / VTT"],
  ["#homebrew", "Homebrew"],
  ["#content", "Enabled Content"],
  ["#settings", "Settings"]
] as const;

export default async function CampaignDashboardPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireUser();
  const { campaignId } = await params;
  const isFounder = await subscriptionService.isFounder(user.id);

  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } }
  });
  if (!membership && !isFounder) notFound();

  const memberRoles = membership?.roles ?? (isFounder ? (["DM", "PLAYER"] as const) : []);
  const isDm = isFounder || hasDmPermission([...memberRoles]);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      characters: { include: { owner: { select: { name: true, username: true } }, milestones: { orderBy: { createdAt: "desc" }, take: 5 } } },
      campaignSessions: { where: { status: { not: "ARCHIVED" } }, orderBy: { sessionNumber: "desc" } },
      invites: { orderBy: { createdAt: "desc" }, take: 30 },
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
      homebrew: { include: { author: { select: { name: true, username: true } } }, orderBy: { updatedAt: "desc" }, take: 30 },
      approvals: { include: { homebrew: true, reviewer: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 30 },
      diceRolls: { include: { roller: { select: { name: true, username: true } }, character: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 },
      campaignEntitlements: { include: { product: true }, orderBy: { grantedAt: "desc" }, take: 20 },
      maps: { include: { images: true, tags: true, layers: true, tokens: true, encounters: true }, orderBy: { updatedAt: "desc" } }
    }
  });
  if (!campaign) notFound();

  const activeSession = campaign.campaignSessions.find((session) => session.status === "ACTIVE");
  const pendingHomebrew = campaign.homebrew.filter((item) => item.status === "PENDING_DM_REVIEW");
  const pendingApprovals = campaign.approvals.filter((approval) => approval.status === "PENDING_DM_REVIEW");
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
  const campaignOption = [{ id: campaign.id, name: campaign.name, roles: [...memberRoles] }];
  const characterOptions = campaign.characters.map((character) => ({ id: character.id, name: character.name, campaignId: character.campaignId }));
  const invites = campaign.invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    roles: invite.roles,
    token: invite.token,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString()
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Link href="/dashboard/campaigns" className="text-sm text-mana">Back to campaigns</Link>
      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Badge tone={isDm ? "gold" : "mana"}>{[...memberRoles].join(", ")}</Badge>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl md:text-6xl">{campaign.name}</h1>
          {campaign.description ? <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">{campaign.description}</p> : null}
        </div>
      </div>

      <nav className="sticky top-14 z-30 mt-6 -mx-4 overflow-x-auto border-y border-white/10 bg-[#090911]/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:px-5 md:top-[72px]">
        <div className="flex min-w-max gap-2">
          {tabs.map(([href, label]) => (
            <a key={href} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-aureate/25 hover:text-white" href={href}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="overview" className="mt-6 scroll-mt-32 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Members</p>
          <p className="mt-2 text-3xl font-black text-white">{campaign.members.length}</p>
        </Card>
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Characters</p>
          <p className="mt-2 text-3xl font-black text-white">{campaign.characters.length}</p>
        </Card>
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Approvals</p>
          <p className="mt-2 text-3xl font-black text-aureate">{pendingHomebrew.length + pendingApprovals.length}</p>
        </Card>
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Sessions</p>
          <p className="mt-2 text-3xl font-black text-mana">{campaign.campaignSessions.length}</p>
        </Card>
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Notes</p>
          <p className="mt-2 text-3xl font-black text-violet">{campaign.campaignNotes.length}</p>
        </Card>
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Maps</p>
          <p className="mt-2 text-3xl font-black text-stamina">{campaign.maps.length}</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Active session</h2>
          {activeSession ? (
            <div className="mt-4">
              <Badge tone="stamina">Session #{activeSession.sessionNumber}</Badge>
              <h3 className="mt-3 text-xl font-bold text-white">{activeSession.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{activeSession.description || "No description yet."}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                <span className="rounded bg-black/25 p-2">Started {activeSession.startedAt ? activeSession.startedAt.toLocaleString() : "pending"}</span>
                <span className="rounded bg-black/25 p-2">{campaign.maps.filter((map) => map.sessionId === activeSession.id).length} attached maps</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-300">No active session. A DM can start one from the session history.</p>
          )}
        </Card>
        <ActivityFeed activities={activities.slice(0, 6)} />
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["Start session", "#sessions"],
          ["Add note", "#notes"],
          ["Invite player", "#invites"],
          ["Create character", `/dashboard/characters/new?campaignId=${campaign.id}`],
          ["Open VTT map", "#maps"],
          ["Review approvals", "#approvals"],
          ["Roll dice", "#dice"]
        ].map(([label, href]) => (
          <a key={label} className="rounded-md border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-aureate/25 hover:bg-white/5" href={href}>
            {label}
          </a>
        ))}
      </section>

      <section id="sessions" className="mt-8 scroll-mt-32">
        <SessionManager campaignId={campaign.id} sessions={sessions} canManage={isDm} />
      </section>

      <section id="characters" className="mt-8 scroll-mt-32">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">Characters</h2>
            <Link className="rounded-md border border-mana/30 px-3 py-2 text-sm font-semibold text-mana" href={`/dashboard/characters/new?campaignId=${campaign.id}`}>Create character</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {campaign.characters.length === 0 ? <p className="text-sm text-zinc-300">No characters are attached to this campaign yet.</p> : null}
            {campaign.characters.map((character) => (
              <div key={character.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <h3 className="font-bold text-white">{character.name}</h3>
                <p className="text-sm text-zinc-400">Player: {character.owner.name || character.owner.username}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="mana">{character.milestones.length} milestones</Badge>
                  {character.milestones[0] ? <span className="text-xs text-zinc-500">{character.milestones[0].title}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="members" className="mt-8 scroll-mt-32">
        <Card>
          <h2 className="text-2xl font-bold text-white">Members</h2>
          <div className="mt-5 grid gap-3">
            {campaign.members.map((member) => (
              <div key={member.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{member.user.name || member.user.username}</p>
                    <p className="truncate text-xs text-zinc-500">{member.user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {member.roles.map((role) => <Badge key={role} tone={role === "DM" ? "gold" : "mana"}>{role.replace("_", " ")}</Badge>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        {isDm ? <div className="mt-5"><MemberRoleEditor campaignId={campaign.id} members={campaign.members} /></div> : null}
      </section>

      <section id="invites" className="mt-8 scroll-mt-32">
        <CampaignInvitesPanel campaignId={campaign.id} invites={invites} canManage={isDm} />
      </section>

      <section id="approvals" className="mt-8 scroll-mt-32">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">Approvals</h2>
            <Badge tone="gold">{pendingHomebrew.length + pendingApprovals.length} pending</Badge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {pendingHomebrew.length + pendingApprovals.length === 0 ? <p className="text-sm text-zinc-300">No campaign approvals are pending.</p> : null}
            {pendingHomebrew.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <Badge tone="violet">{item.type.replace(/_/g, " ")}</Badge>
                <h3 className="mt-2 font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">By {item.author.name || item.author.username}</p>
              </div>
            ))}
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <Badge tone="gold">{approval.status.replace(/_/g, " ")}</Badge>
                <h3 className="mt-2 font-bold text-white">{approval.homebrew?.title || "Approval request"}</h3>
                {approval.requestNote ? <p className="mt-2 text-sm text-zinc-300">{approval.requestNote}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="dice" className="mt-8 scroll-mt-32">
        <Card>
          <h2 className="text-2xl font-bold text-white">Recent dice rolls</h2>
          <div className="mt-5 grid gap-3">
            {campaign.diceRolls.length === 0 ? <p className="text-sm text-zinc-300">No visible campaign rolls yet.</p> : null}
            {campaign.diceRolls.map((roll) => (
              <div key={roll.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{roll.label || roll.expression}</p>
                    <p className="text-sm text-zinc-400">{roll.character?.name || roll.roller.name || roll.roller.username} rolled {roll.expression}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-aureate">{roll.total}</p>
                    <p className="text-xs text-zinc-500">{roll.visibility.replace(/_/g, " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-5">
          <DiceRoller campaigns={campaignOption} characters={characterOptions} />
        </div>
      </section>

      <section id="notes" className="mt-8 scroll-mt-32">
        <NotesPanel
          campaignId={campaign.id}
          notes={notes}
          sessions={sessions.map((session) => ({ id: session.id, title: session.title }))}
          characters={campaign.characters.map((character) => ({ id: character.id, name: character.name }))}
          canDm={isDm}
        />
      </section>

      <section id="maps" className="mt-8 scroll-mt-32">
        <VttFoundationPanel campaignId={campaign.id} maps={maps} sessions={sessions.map((session) => ({ id: session.id, title: session.title }))} canManage={isDm} />
      </section>

      <section id="homebrew" className="mt-8 scroll-mt-32">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">Homebrew</h2>
            <Link className="rounded-md border border-violet/30 px-3 py-2 text-sm font-semibold text-violet" href="/dashboard/homebrew">Open homebrew</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {campaign.homebrew.length === 0 ? <p className="text-sm text-zinc-300">No homebrew is attached to this campaign yet.</p> : null}
            {campaign.homebrew.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="violet">{item.type.replace(/_/g, " ")}</Badge>
                  <Badge tone={item.status === "APPROVED_PUBLIC" || item.status === "APPROVED_PRIVATE" ? "mana" : "gold"}>{item.status.replace(/_/g, " ")}</Badge>
                </div>
                <h3 className="mt-3 font-bold text-white">{item.title}</h3>
                {item.summary ? <p className="mt-2 text-sm text-zinc-300">{item.summary}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="content" className="mt-8 scroll-mt-32">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">Enabled Content</h2>
            <Badge tone="violet">Marketplace ready</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Campaign-enabled compendiums, purchased rulesets, SRD packs, and marketplace content will appear here as entitlement workflows mature.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {campaign.campaignEntitlements.length === 0 ? <p className="text-sm text-zinc-300">No premium or marketplace content is enabled for this campaign yet.</p> : null}
            {campaign.campaignEntitlements.map((entitlement) => (
              <div key={entitlement.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <Badge tone="gold">{entitlement.product.type.replace(/_/g, " ")}</Badge>
                <h3 className="mt-2 font-bold text-white">{entitlement.product.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{entitlement.active ? "Enabled" : "Disabled"}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="settings" className="mt-8 scroll-mt-32">
        <CampaignSettingsPanel campaignId={campaign.id} name={campaign.name} description={campaign.description} archived={Boolean(campaign.archivedAt)} settings={campaign.settings} canManage={isDm} />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <TimelineView events={timeline.slice(0, 30)} />
        <ActivityFeed activities={activities.slice(0, 12)} title="Activity archive" />
      </section>
    </main>
  );
}
