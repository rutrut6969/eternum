import Link from "next/link";
import { DiceRoller } from "@/components/dice/dice-roller";
import { EmailStatusCard } from "@/components/account/email-status-card";
import { InviteAcceptForm } from "@/components/campaigns/invite-accept-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const queues = [
  ["Character approvals", "Backstory analysis and starting profession suggestions"],
  ["Homebrew approvals", "Custom spells, items, recipes, NPCs, and discipline perks"],
  ["Hidden rolls", "DM-only and roller-visible dice waiting for reveal decisions"]
];

export default async function DashboardPage() {
  const user = await requireUser();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true }
  });
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id, campaign: { archivedAt: null } },
    include: {
      campaign: {
        include: {
          _count: { select: { diceRolls: true, approvals: true, characters: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  const characters = await prisma.character.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, campaignId: true },
    orderBy: { updatedAt: "desc" }
  });
  const campaignOptions = memberships.map((membership) => ({
    id: membership.campaign.id,
    name: membership.campaign.name,
    roles: membership.roles
  }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="mana">Workspace</Badge>
      <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">Campaign Command</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Quick actions</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/dashboard/campaigns" className="rounded-md border border-white/10 bg-black/25 px-4 py-3 text-zinc-200 hover:border-aureate/40">
              Manage campaigns
            </Link>
            <Link href="/dashboard/characters" className="rounded-md border border-white/10 bg-black/25 px-4 py-3 text-zinc-200 hover:border-mana/40">
              Build characters
            </Link>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <h3 className="font-semibold text-white">Accept invite</h3>
            <InviteAcceptForm />
          </div>
        </Card>
        <div className="grid gap-5 md:grid-cols-3">
          {queues.map(([title, copy]) => (
            <Card key={title}>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Card>
          ))}
        </div>
      </div>
      {account ? (
        <section className="mt-8">
          <EmailStatusCard email={account.email} verified={Boolean(account.emailVerified)} />
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white">My Campaigns</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-300">No campaigns yet. Create one or accept an invite.</p>
            </Card>
          ) : null}
          {memberships.map((membership) => (
            <Card key={membership.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{membership.campaign.name}</h3>
                  <p className="mt-2 text-sm text-zinc-300">{membership.campaign.description || "No description yet."}</p>
                </div>
                <Badge tone={membership.roles.includes("DM") ? "gold" : "mana"}>{membership.roles.join(", ")}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
                <span className="rounded-md bg-black/25 p-2">{membership.campaign._count.characters} chars</span>
                <span className="rounded-md bg-black/25 p-2">{membership.campaign._count.approvals} approvals</span>
                <span className="rounded-md bg-black/25 p-2">{membership.campaign._count.diceRolls} rolls</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <DiceRoller campaigns={campaignOptions} characters={characters} />
      </section>
    </main>
  );
}
