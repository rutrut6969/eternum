import { CharacterCreatorWizard } from "@/components/characters/character-creator-wizard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewCharacterPage() {
  const user = await requireUser();
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id, campaign: { archivedAt: null } },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  const campaigns = memberships.map((membership) => ({ id: membership.campaign.id, name: membership.campaign.name }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">Character Creator</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Create a classless Eternum character</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        Build identity, species, story, attributes, training, and starting wallet in one mobile-friendly flow. SRD/Open5e data is labeled separately from homebrew.
      </p>
      <section className="mt-8">
        {campaigns.length ? (
          <CharacterCreatorWizard campaigns={campaigns} />
        ) : (
          <Card>
            <h2 className="text-xl font-bold text-white">Join a campaign first</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Characters are campaign-scoped so gameplay data, currency, approvals, and future loot automation stay auditable.</p>
          </Card>
        )}
      </section>
    </main>
  );
}

