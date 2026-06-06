import { Badge } from "@/components/ui/badge";
import { CampaignManager } from "@/components/campaigns/campaign-manager";
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
      invites: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
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
  const summaries = activeCampaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    settings: campaign.settings,
    members: campaign.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      roles: member.roles,
      user: { name: member.user.name, email: member.user.email, username: member.user.username }
    })),
    invites: campaign.invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      token: invite.token,
      roles: invite.roles,
      status: invite.status
    })),
    characters: campaign.characters,
    counts: { rolls: campaign._count.diceRolls, approvals: campaign._count.approvals }
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone={hasDmWorkspace ? "gold" : "mana"}>{hasDmWorkspace ? "DM Tools" : "Campaigns"}</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Campaign workspace</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        {hasDmWorkspace
          ? "Create, edit, join, and sort your campaigns by the role you play at each table."
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
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeCampaigns.map((campaign) => {
          const membership = campaign.members.find((member) => member.userId === user.id);
          return (
            <Card key={campaign.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{campaign.name}</h2>
                  <p className="mt-2 text-sm text-zinc-400">{campaign.description || "No description yet."}</p>
                </div>
                <Badge tone={membership?.roles.includes("DM") ? "gold" : "mana"}>{membership?.roles.join(", ") ?? "Member"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs text-zinc-300 sm:grid-cols-4">
                <span className="rounded bg-black/25 p-2">{campaign._count.members} members</span>
                <span className="rounded bg-black/25 p-2">{campaign._count.characters} chars</span>
                <span className="rounded bg-black/25 p-2">{campaign._count.approvals} approvals</span>
                <span className="rounded bg-black/25 p-2">{campaign.campaignSessions[0] ? "active session" : "no session"}</span>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="mt-8">
        <CampaignManager campaigns={summaries} canCreateCampaign={canCreateCampaign} createCampaignMessage={createCampaignMessage} />
      </div>

      {archivedCampaigns.length ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-white">Archived campaigns</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">{campaign.description || "Archived table"}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
