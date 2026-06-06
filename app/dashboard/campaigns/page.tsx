import { Badge } from "@/components/ui/badge";
import { CampaignManager } from "@/components/campaigns/campaign-manager";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CampaignsPage() {
  const user = await requireUser();
  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { userId: user.id } }, archivedAt: null },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, username: true } } } },
      invites: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
      characters: { where: { ownerId: user.id }, select: { id: true, name: true } },
      _count: { select: { diceRolls: true, approvals: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
  const summaries = campaigns.map((campaign) => ({
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
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="gold">DM Tools</Badge>
      <h1 className="mt-5 text-4xl font-black text-white">Campaigns</h1>
      <div className="mt-8">
        <CampaignManager campaigns={summaries} />
      </div>
    </main>
  );
}
