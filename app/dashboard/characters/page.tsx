import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ResourceBars } from "@/components/resource-bars";
import { BackstoryApprovalPanel } from "@/components/characters/backstory-approval-panel";
import { CharacterWorkbench } from "@/components/characters/character-workbench";
import { MilestoneList } from "@/components/characters/milestone-list";
import { HomebrewApprovalPanel } from "@/components/homebrew/homebrew-approval-panel";
import { HomebrewBuilder } from "@/components/homebrew/homebrew-builder";
import { HomebrewPortfolio } from "@/components/homebrew/homebrew-portfolio";
import { WalletCard } from "@/components/currency/wallet-card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateMana, calculateStamina } from "@/lib/rules/resources";

export default async function CharactersPage() {
  const user = await requireUser();
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id, campaign: { archivedAt: null } },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  const characters = await prisma.character.findMany({
    where: { ownerId: user.id },
    include: {
      campaign: { select: { name: true } },
      professionLevels: true,
      backstoryAnalyses: { orderBy: { createdAt: "desc" }, take: 3 },
      milestones: { orderBy: { createdAt: "desc" }, take: 20 },
      wallet: true,
      currencyTransactions: { orderBy: { createdAt: "desc" }, take: 5 }
    },
    orderBy: { updatedAt: "desc" }
  });
  const dmCampaignIds = memberships.filter((membership) => membership.roles.includes("DM") || membership.roles.includes("ASSISTANT_DM")).map((membership) => membership.campaignId);
  const pendingAnalyses = await prisma.backstoryAnalysis.findMany({
    where: { status: "PENDING_DM_REVIEW", character: { campaignId: { in: dmCampaignIds } } },
    include: { character: { select: { name: true, owner: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  const pendingHomebrew = await prisma.homebrewContent.findMany({
    where: {
      status: "PENDING_DM_REVIEW",
      campaignId: { in: dmCampaignIds }
    },
    include: {
      author: { select: { name: true, username: true, email: true } },
      character: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      revisions: { orderBy: { revisionNumber: "desc" }, take: 1, include: { reviewedBy: { select: { name: true, username: true } } } }
    },
    orderBy: { updatedAt: "desc" }
  });
  const myHomebrew = await prisma.homebrewContent.findMany({
    where: { authorId: user.id },
    include: {
      campaign: { select: { id: true, name: true } },
      character: { select: { id: true, name: true } },
      reviewedBy: { select: { name: true, username: true } },
      revisions: { orderBy: { revisionNumber: "desc" }, take: 6, include: { reviewedBy: { select: { name: true, username: true } } } }
    },
    orderBy: { updatedAt: "desc" },
    take: 60
  });
  const campaignOptions = memberships.map((membership) => ({
    id: membership.campaign.id,
    name: membership.campaign.name,
    roles: membership.roles
  }));
  const characterSummaries = characters.map((character) => {
    const submissions = myHomebrew.filter((item) => {
      const body = item.body && typeof item.body === "object" && !Array.isArray(item.body) ? item.body as Record<string, unknown> : {};
      return item.characterId === character.id || String(body.characterId ?? "") === character.id;
    });
    return {
    id: character.id,
    campaignId: character.campaignId,
    name: character.name,
    ancestry: character.ancestry,
    className: character.className,
    level: character.level,
    castingAbility: character.castingAbility,
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    inventory: Array.isArray(character.inventory) ? character.inventory : [],
    learnedSpells: Array.isArray(character.learnedSpells) ? character.learnedSpells : [],
    customSpells: Array.isArray(character.customSpells) ? character.customSpells : [],
    craftedItems: Array.isArray(character.craftedItems) ? character.craftedItems : [],
    disciplines: Array.isArray(character.disciplines) ? character.disciplines : [],
    traits: Array.isArray(character.traits) ? character.traits : [],
    flaws: Array.isArray(character.flaws) ? character.flaws : [],
    affinities: Array.isArray(character.affinities) ? character.affinities : [],
    tamedCreatures: Array.isArray(character.tamedCreatures) ? character.tamedCreatures : [],
    undeadServants: Array.isArray(character.undeadServants) ? character.undeadServants : [],
    professionLevels: character.professionLevels.map((profession) => ({ profession: profession.profession, level: profession.level, xp: profession.xp })),
    backstoryAnalyses: character.backstoryAnalyses.map((analysis) => ({ id: analysis.id, status: analysis.status, dmNotes: analysis.dmNotes, createdAt: analysis.createdAt.toISOString(), reviewedAt: analysis.reviewedAt?.toISOString() ?? null })),
    milestones: character.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, type: milestone.type, createdAt: milestone.createdAt.toISOString() })),
    submissions: submissions.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      summary: item.summary,
      status: item.status,
      visibility: item.visibility,
      rarity: item.rarity,
      discipline: item.discipline,
      body: item.body,
      rulesResult: item.rulesResult,
      generatedByAi: item.generatedByAi,
      campaignId: item.campaignId,
      campaignName: item.campaign?.name ?? null,
      characterId: item.characterId,
      characterName: item.character?.name ?? character.name,
      submittedAt: item.submittedAt?.toISOString() ?? item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      reviewedByName: item.reviewedBy?.name || item.reviewedBy?.username || null,
      dmFeedback: item.dmFeedback,
      updatedAt: item.updatedAt.toISOString(),
      currentRevisionId: item.currentRevisionId,
      currentRevisionNumber: item.revisions[0]?.revisionNumber ?? null,
      revisions: item.revisions.map((revision) => ({
        id: revision.id,
        revisionNumber: revision.revisionNumber,
        submittedAt: revision.submittedAt.toISOString(),
        dmFeedback: revision.dmFeedback,
        dmDecision: revision.dmDecision,
        reviewedAt: revision.reviewedAt?.toISOString() ?? null,
        reviewedByName: revision.reviewedBy?.name || revision.reviewedBy?.username || null
      }))
    }))
  };
  });
  const pendingSummaries = pendingAnalyses.map((analysis) => ({
    id: analysis.id,
    status: analysis.status,
    suggestion: analysis.suggestion,
    character: analysis.character
  }));
  const pendingHomebrewSummaries = pendingHomebrew.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    summary: item.summary,
    status: item.status,
    rarity: item.rarity,
    discipline: item.discipline,
    publishRequestedAt: item.publishRequestedAt?.toISOString() ?? null,
    imageUrl: item.imageUrl,
    imageAltText: item.imageAltText,
    body: item.body,
    rulesResult: item.rulesResult,
    generatedByAi: item.generatedByAi,
    campaign: item.campaign,
    character: item.character,
    submittedAt: item.submittedAt?.toISOString() ?? item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    currentRevisionNumber: item.revisions[0]?.revisionNumber ?? null,
    author: item.author
  }));
  const myHomebrewSummaries = myHomebrew.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    summary: item.summary,
    status: item.status,
    visibility: item.visibility,
    publishRequestedAt: item.publishRequestedAt?.toISOString() ?? null,
    imageUrl: item.imageUrl,
    imageAltText: item.imageAltText,
    campaignName: item.campaign?.name ?? null,
    characterName: item.character?.name ?? null,
    submittedAt: item.submittedAt?.toISOString() ?? item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    reviewedByName: item.reviewedBy?.name || item.reviewedBy?.username || null,
    dmFeedback: item.dmFeedback,
    currentRevisionNumber: item.revisions[0]?.revisionNumber ?? null
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">Character Builder</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Character workspace</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Create campaign-owned characters and manage their inventory, spells, professions, disciplines, traits, and AI backstory approvals.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="inline-flex rounded-md bg-mana px-4 py-3 text-sm font-semibold text-void" href="/dashboard/characters/new">
          Open guided creator
        </Link>
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {characters.length === 0 ? (
          <Card>
            <h2 className="text-xl font-bold text-white">No characters yet</h2>
            <p className="mt-3 text-sm text-zinc-300">Use the creation panel below to make your first campaign character.</p>
          </Card>
        ) : null}
        {characters.map((character) => {
          const scores = {
            str: character.strength,
            dex: character.dexterity,
            con: character.constitution,
            int: character.intelligence,
            wis: character.wisdom,
            cha: character.charisma
          };
          const hp = 10 + character.level * 6 + Math.floor((character.constitution - 10) / 2) * character.level;
          return (
            <Card key={character.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">{character.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">{character.campaign?.name || "No campaign"} / {[character.ancestry, character.className].filter(Boolean).join(" / ") || "Unclassed"}</p>
                </div>
                <Badge tone="gold">Level {character.level}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
                <span className="rounded bg-black/25 p-2">HP {hp}</span>
                <span className="rounded bg-black/25 p-2">{character.professionLevels.length} profs</span>
                <span className="rounded bg-black/25 p-2">{Array.isArray(character.learnedSpells) ? character.learnedSpells.length : 0} spells</span>
              </div>
              <Link className="mt-3 block rounded-md border border-aureate/20 bg-aureate/10 p-2 text-sm font-semibold text-aureate hover:bg-aureate/15" href={`/dashboard/characters/${character.id}/wallet`}>
                Wallet {character.wallet?.balanceCp ?? 0} CP
              </Link>
              <div className="mt-4">
                <ResourceBars mana={calculateMana(character.level, scores, character.castingAbility ?? "WIS")} stamina={calculateStamina(character.level, scores)} />
              </div>
            </Card>
          );
        })}
      </section>
      <div className="mt-8">
        <CharacterWorkbench campaigns={campaignOptions} characters={characterSummaries} />
      </div>
      {characters.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {characters.slice(0, 4).map((character) => (
            <WalletCard key={character.id} characterName={character.name} balanceCp={character.wallet?.balanceCp ?? 0} transactions={character.currencyTransactions} />
          ))}
        </div>
      ) : null}
      <div className="mt-8">
        <MilestoneList milestones={characterSummaries.flatMap((character) => character.milestones)} />
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <HomebrewBuilder campaigns={campaignOptions} characters={characterSummaries.map((character) => ({ id: character.id, name: character.name, campaignId: character.campaignId }))} />
        <HomebrewPortfolio items={myHomebrewSummaries} />
      </div>
      <div id="approvals" className="mt-8 scroll-mt-24">
        <BackstoryApprovalPanel analyses={pendingSummaries} />
      </div>
      <div className="mt-8">
        <HomebrewApprovalPanel items={pendingHomebrewSummaries} />
      </div>
    </main>
  );
}
