import Link from "next/link";
import { EmailStatusCard } from "@/components/account/email-status-card";
import { InviteAcceptForm } from "@/components/campaigns/invite-accept-form";
import { DiceRoller } from "@/components/dice/dice-roller";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResourceBars } from "@/components/resource-bars";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateMana, calculateStamina } from "@/lib/rules/resources";
import { subscriptionService } from "@/lib/subscriptions/service";

const baseQuickActions = [
  { href: "/dashboard", label: "Join campaign", tone: "mana" },
  { href: "/dashboard/characters/new", label: "Create character", tone: "mana" },
  { href: "/dashboard/homebrew/spells/new", label: "Create homebrew spell", tone: "violet" },
  { href: "/dashboard/homebrew/items/new", label: "Create homebrew item", tone: "violet" },
  { href: "#dice", label: "Open dice roller", tone: "crimson" },
  { href: "/library", label: "Browse public library", tone: "gold" },
  { href: "/dashboard/maps", label: "Open maps", tone: "mana" }
] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true, name: true, username: true, isFounder: true, globalRoles: true }
  });
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id },
    include: {
      campaign: {
        include: {
          campaignSessions: { where: { status: "ACTIVE" }, take: 1 },
          _count: { select: { diceRolls: true, approvals: true, characters: true, members: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 6
  });
  const activeMemberships = memberships.filter((membership) => !membership.campaign.archivedAt);
  const characters = await prisma.character.findMany({
    where: { ownerId: user.id },
    include: { campaign: { select: { name: true } }, professionLevels: true },
    orderBy: { updatedAt: "desc" },
    take: 6
  });
  const homebrew = await prisma.homebrewContent.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 6
  });
  const diceRolls = await prisma.diceRoll.findMany({
    where: { rollerId: user.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  const dmCampaignIds = activeMemberships.filter((membership) => membership.roles.includes("DM") || membership.roles.includes("ASSISTANT_DM")).map((membership) => membership.campaignId);
  const canAccessDmTools = await subscriptionService.canAccessDmTools(user.id);
  const canCreateCampaign = account?.emailVerified && (await subscriptionService.canCreateCampaign(user.id));
  const showDmTools = canAccessDmTools || dmCampaignIds.length > 0 || account?.isFounder === true;
  const pendingApprovals = await prisma.approvalRequest.count({
    where: { campaignId: { in: dmCampaignIds }, status: "PENDING_DM_REVIEW" }
  });
  const recentActivity = await prisma.activityLog.findMany({
    where: { campaignId: { in: activeMemberships.map((membership) => membership.campaignId) } },
    include: { campaign: { select: { name: true } }, actor: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  const campaignOptions = activeMemberships.map((membership) => ({
    id: membership.campaign.id,
    name: membership.campaign.name,
    roles: membership.roles
  }));
  const characterOptions = characters.map((character) => ({
    id: character.id,
    name: character.name,
    campaignId: character.campaignId
  }));
  const quickActions = [
    ...(canCreateCampaign ? [{ href: "/dashboard/campaigns", label: "Create campaign", tone: "gold" } as const] : []),
    ...baseQuickActions
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge tone="mana">Workspace</Badge>
          <h1 className="mt-4 text-3xl font-black text-white md:text-6xl">Your Eternum table</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-300">
            Campaigns, characters, dice, homebrew, maps, approvals, and account tools in one mobile-ready command surface.
          </p>
        </div>
        <Link className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-aureate/30" href="/dashboard/account">
          Account settings
        </Link>
      </div>

      {account && !account.emailVerified ? (
        <section className="mt-6">
          <EmailStatusCard email={account.email} verified={false} />
        </section>
      ) : null}

      {account?.isFounder ? (
        <section className="mt-5">
          <Card className="border-aureate/20 bg-aureate/5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Founder / Max Tier</h2>
                <p className="mt-1 text-sm text-zinc-300">Lifetime access is active for this account.</p>
              </div>
              <Badge tone="gold">All gates unlocked</Badge>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5">
            <Badge tone={action.tone}>{action.label.split(" ")[0]}</Badge>
            <span className="mt-3 block">{action.label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Active campaigns</h2>
            <Link className="text-sm text-mana" href="/dashboard/campaigns">View all</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {activeMemberships.length === 0 ? <p className="text-sm text-zinc-300">Create a campaign or accept an invite to start playing.</p> : null}
            {activeMemberships.slice(0, 4).map((membership) => (
              <Link key={membership.id} className="rounded-md border border-white/10 bg-black/25 p-4 transition hover:border-mana/25" href={`/dashboard/campaigns/${membership.campaign.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-white">{membership.campaign.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{membership.campaign.description || "No campaign description yet."}</p>
                  </div>
                  <Badge tone={membership.roles.includes("DM") ? "gold" : "mana"}>{membership.roles.join(", ")}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-zinc-300">
                  <span className="rounded bg-black/30 p-2">{membership.campaign._count.members} members</span>
                  <span className="rounded bg-black/30 p-2">{membership.campaign._count.characters} chars</span>
                  <span className="rounded bg-black/30 p-2">{membership.campaign._count.approvals} approvals</span>
                  <span className="rounded bg-black/30 p-2">{membership.campaign.campaignSessions[0] ? "active" : "idle"}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Characters</h2>
            <Link className="text-sm text-mana" href="/dashboard/characters">Open sheets</Link>
          </div>
          <div className="mt-5 grid gap-3">
            {characters.length === 0 ? <p className="text-sm text-zinc-300">No characters yet. Create one from the character workspace.</p> : null}
            {characters.slice(0, 3).map((character) => {
              const scores = {
                str: character.strength,
                dex: character.dexterity,
                con: character.constitution,
                int: character.intelligence,
                wis: character.wisdom,
                cha: character.charisma
              };
              return (
                <div key={character.id} className="rounded-md border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{character.name}</h3>
                      <p className="text-xs text-zinc-500">{character.campaign?.name || "No campaign"} / Level {character.level}</p>
                    </div>
                    <Badge tone="violet">{character.professionLevels.length} professions</Badge>
                  </div>
                  <div className="mt-4">
                    <ResourceBars mana={calculateMana(character.level, scores, character.castingAbility ?? "WIS")} stamina={calculateStamina(character.level, scores)} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {showDmTools ? (
          <Card>
            <h2 className="text-xl font-bold text-white">DM Tools</h2>
            <p className="mt-3 text-3xl font-black text-aureate">{pendingApprovals}</p>
            <p className="mt-2 text-sm text-zinc-400">Approvals, sessions, hidden rolls, member management, and campaign settings.</p>
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="rounded-md border border-white/10 px-3 py-2 text-mana hover:bg-white/5" href="/dashboard/characters#approvals">Approvals</Link>
              <Link className="rounded-md border border-white/10 px-3 py-2 text-mana hover:bg-white/5" href="/dashboard/campaigns">Campaign Management</Link>
              <Link className="rounded-md border border-white/10 px-3 py-2 text-mana hover:bg-white/5" href="/dashboard#dice">Hidden Rolls</Link>
            </div>
          </Card>
        ) : null}
        <Card>
          <h2 className="text-xl font-bold text-white">Recent homebrew</h2>
          <div className="mt-4 grid gap-2">
            {homebrew.length === 0 ? <p className="text-sm text-zinc-300">Draft spells, items, recipes, and creatures from the homebrew workspace.</p> : null}
            {homebrew.slice(0, 4).map((item) => (
              <p key={item.id} className="flex items-center justify-between gap-3 rounded bg-black/25 p-2 text-sm">
                <span className="truncate text-zinc-200">{item.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">{item.status.replace(/_/g, " ")}</span>
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-white">Recent activity</h2>
          <div className="mt-4 grid gap-2">
            {recentActivity.length === 0 ? <p className="text-sm text-zinc-300">No campaign activity yet.</p> : null}
            {recentActivity.map((activity) => (
              <p key={activity.id} className="rounded bg-black/25 p-2 text-sm text-zinc-300">
                <span className="block truncate text-white">{activity.type.replace(/_/g, " ")}</span>
                <span className="text-xs text-zinc-500">{activity.campaign.name}</span>
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-white">Public library</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Browse approved homebrew and maps, then bring ideas back to your campaigns.</p>
          <div className="mt-4 grid gap-2">
            <Link className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5" href="/library">Homebrew library</Link>
            <Link className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5" href="/maps">Map library</Link>
          </div>
        </Card>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="text-2xl font-bold text-white">Accept invite</h2>
          <p className="mt-2 text-sm text-zinc-400">Paste a campaign token from your DM.</p>
          <div className="mt-4">
            <InviteAcceptForm />
          </div>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">Recent rolls</h2>
          <div className="mt-5 grid gap-2">
            {diceRolls.length === 0 ? <p className="text-sm text-zinc-300">No rolls yet. The dice roller below uses the server-side roll API.</p> : null}
            {diceRolls.map((roll) => (
              <p key={roll.id} className="flex items-center justify-between gap-3 rounded bg-black/25 p-2 text-sm">
                <span className="truncate text-zinc-200">{roll.label || roll.expression} / {roll.campaign.name}</span>
                <span className="shrink-0 font-bold text-white">{roll.total}</span>
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section id="dice" className="mt-8 scroll-mt-24">
        <DiceRoller campaigns={campaignOptions} characters={characterOptions} />
      </section>
    </main>
  );
}
