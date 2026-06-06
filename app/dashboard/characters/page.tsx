import { Badge } from "@/components/ui/badge";
import { BackstoryApprovalPanel } from "@/components/characters/backstory-approval-panel";
import { CharacterWorkbench } from "@/components/characters/character-workbench";
import { HomebrewApprovalPanel } from "@/components/homebrew/homebrew-approval-panel";
import { HomebrewBuilder } from "@/components/homebrew/homebrew-builder";
import { HomebrewPortfolio } from "@/components/homebrew/homebrew-portfolio";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
      professionLevels: true,
      backstoryAnalyses: { orderBy: { createdAt: "desc" }, take: 3 }
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
      author: { select: { name: true, username: true, email: true } }
    },
    orderBy: { updatedAt: "desc" }
  });
  const myHomebrew = await prisma.homebrewContent.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 20
  });
  const campaignOptions = memberships.map((membership) => ({
    id: membership.campaign.id,
    name: membership.campaign.name,
    roles: membership.roles
  }));
  const characterSummaries = characters.map((character) => ({
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
    backstoryAnalyses: character.backstoryAnalyses.map((analysis) => ({ id: analysis.id, status: analysis.status, dmNotes: analysis.dmNotes }))
  }));
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
    body: item.body,
    rulesResult: item.rulesResult,
    author: item.author
  }));
  const myHomebrewSummaries = myHomebrew.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    summary: item.summary,
    status: item.status,
    visibility: item.visibility,
    publishRequestedAt: item.publishRequestedAt?.toISOString() ?? null
  }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="mana">Character Builder</Badge>
      <h1 className="mt-5 text-4xl font-black text-white">Backstory-driven sheets</h1>
      <div className="mt-8">
        <CharacterWorkbench campaigns={campaignOptions} characters={characterSummaries} />
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <HomebrewBuilder campaigns={campaignOptions} characters={characterSummaries.map((character) => ({ id: character.id, name: character.name, campaignId: character.campaignId }))} />
        <HomebrewPortfolio items={myHomebrewSummaries} />
      </div>
      <div className="mt-8">
        <BackstoryApprovalPanel analyses={pendingSummaries} />
      </div>
      <div className="mt-8">
        <HomebrewApprovalPanel items={pendingHomebrewSummaries} />
      </div>
    </main>
  );
}
