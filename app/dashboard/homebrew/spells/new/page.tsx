import { HomebrewDraftForm } from "@/components/homebrew/homebrew-draft-form";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewSpellPage() {
  const user = await requireUser();
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id, campaign: { archivedAt: null } },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  const characters = await prisma.character.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, campaignId: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">Spell Builder</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Custom spell draft</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Create an Eternum spell card with tier, mana, concentration, and infusion metadata ready for DM review.</p>
      <div className="mt-8">
        <HomebrewDraftForm kind="CUSTOM_SPELL" campaigns={memberships.map((membership) => membership.campaign)} characters={characters} />
      </div>
    </main>
  );
}
