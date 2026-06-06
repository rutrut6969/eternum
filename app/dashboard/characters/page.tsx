import { Badge } from "@/components/ui/badge";
import { BackstoryApprovalPanel } from "@/components/characters/backstory-approval-panel";
import { CharacterWorkbench } from "@/components/characters/character-workbench";
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

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="mana">Character Builder</Badge>
      <h1 className="mt-5 text-4xl font-black text-white">Backstory-driven sheets</h1>
      <div className="mt-8">
        <CharacterWorkbench campaigns={campaignOptions} characters={characterSummaries} />
      </div>
      <div className="mt-8">
        <BackstoryApprovalPanel analyses={pendingSummaries} />
      </div>
    </main>
  );
}
