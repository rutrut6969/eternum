import { Badge } from "@/components/ui/badge";
import { CampaignCreateCard } from "@/components/campaigns/campaign-create-card";
import { InviteAcceptForm } from "@/components/campaigns/invite-accept-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

export default async function CampaignsPage() {
  const user = await requireUser();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, isFounder: true }
  });
  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      characters: { where: { ownerId: user.id }, select: { id: true, name: true } },
      campaignSessions: { where: { status: "ACTIVE" }, take: 1 },
      _count: { select: { diceRolls: true, approvals: true, members: true, characters: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
  const activeCampaigns = campaigns.filter((campaign) => !campaign.archivedAt);
  const archivedCampaigns = campaigns.filter((campaign) => campaign.archivedAt);
  const dmCampaigns = activeCampaigns.filter((campaign) => campaign.members.some((member) => member.userId === user.id && (member.roles.includes("DM") || member.roles.includes("ASSISTANT_DM"))));
  const playerCampaigns = activeCampaigns.filter((campaign) => campaign.members.some((member) => member.userId === user.id && member.roles.includes("PLAYER")));
  const canUseCampaignCreation = await subscriptionService.canCreateCampaign(user.id);
  const canCreateCampaign = Boolean(account?.emailVerified && canUseCampaignCreation);
  const hasDmWorkspace = dmCampaigns.length > 0 || account?.isFounder === true || (await subscriptionService.canAccessDmTools(user.id));
  const createCampaignMessage = !account?.emailVerified
    ? "Verify your email before creating campaigns. You can still accept invites, build characters, and browse the public library."
    : "Your current plan cannot create campaigns yet. You can still accept invites and play in existing campaigns.";

  function CampaignCard({ campaign, archived = false }: { campaign: typeof campaigns[number]; archived?: boolean }) {
    const membership = campaign.members.find((member) => member.userId === user.id);
    const isDm = membership?.roles.includes("DM") || membership?.roles.includes("ASSISTANT_DM");
    return (
      <Card>
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{campaign.description || (archived ? "Archived table." : "No description yet.")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {membership?.roles.map((role) => <Badge key={role} tone={role === "DM" ? "gold" : "mana"}>{role.replace("_", " ")}</Badge>) ?? <Badge tone="mana">Member</Badge>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs text-zinc-300 sm:grid-cols-4">
            <span className="rounded bg-black/25 p-2">{campaign._count.members} members</span>
            <span className="rounded bg-black/25 p-2">{campaign._count.characters} chars</span>
            <span className="rounded bg-black/25 p-2">{campaign._count.approvals} approvals</span>
            <span className="rounded bg-black/25 p-2">{campaign.campaignSessions[0] ? "active" : "idle"}</span>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Badge tone={archived ? "crimson" : isDm ? "gold" : "violet"}>{archived ? "Archived" : isDm ? "Manage" : "Play"}</Badge>
            <a className="rounded-md bg-aureate px-4 py-3 text-center text-sm font-semibold text-void hover:bg-aureate/90" href={`/dashboard/campaigns/${campaign.id}`}>
              Open Campaign
            </a>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone={hasDmWorkspace ? "gold" : "mana"}>{hasDmWorkspace ? "DM Tools" : "Campaigns"}</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Campaign launcher</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        {hasDmWorkspace
          ? "Create tables, join by invite, and open each campaign as its own command center."
          : "Join campaigns by invite, open the tables you play in, and keep campaign access separate from character data."}
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {hasDmWorkspace ? (
          <Card>
            <h2 className="text-xl font-bold text-white">Campaigns I DM</h2>
            <p className="mt-3 text-4xl font-black text-aureate">{dmCampaigns.length}</p>
            <p className="mt-2 text-sm text-zinc-400">Tables where you can manage members, sessions, maps, and approvals.</p>
          </Card>
        ) : (
          <Card>
            <h2 className="text-xl font-bold text-white">Player access</h2>
            <p className="mt-3 text-4xl font-black text-mana">{activeCampaigns.length}</p>
            <p className="mt-2 text-sm text-zinc-400">Tables available through accepted invites and memberships.</p>
          </Card>
        )}
        <Card>
          <h2 className="text-xl font-bold text-white">Campaigns I play in</h2>
          <p className="mt-3 text-4xl font-black text-mana">{playerCampaigns.length}</p>
          <p className="mt-2 text-sm text-zinc-400">Tables where your characters and rolls belong.</p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-white">Join campaign</h2>
          <p className="mt-2 text-sm text-zinc-400">Paste an invite token from your DM.</p>
          <div className="mt-4">
            <InviteAcceptForm />
          </div>
        </Card>
        <CampaignCreateCard canCreateCampaign={canCreateCampaign} createCampaignMessage={createCampaignMessage} />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">Campaigns I DM</h2>
          <Badge tone="gold">{dmCampaigns.length}</Badge>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dmCampaigns.length === 0 ? <Card><p className="text-sm text-zinc-300">No DM campaigns yet.</p></Card> : null}
          {dmCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">Campaigns I play in</h2>
          <Badge tone="mana">{playerCampaigns.length}</Badge>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playerCampaigns.length === 0 ? <Card><p className="text-sm text-zinc-300">No player campaigns yet. Accept an invite to join a table.</p></Card> : null}
          {playerCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
        </div>
      </section>

      {archivedCampaigns.length ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-white">Archived campaigns</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} archived />)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
