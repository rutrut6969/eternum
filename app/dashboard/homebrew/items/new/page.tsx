import { HomebrewDraftForm } from "@/components/homebrew/homebrew-draft-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewItemPage() {
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
      <Badge tone="gold">Item Builder</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Custom item draft</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Create manual or AI-assisted items with rarity, crafting requirements, attunement notes, balance notes, and image metadata.</p>
      <div className="mt-8 grid gap-5">
        <HomebrewDraftForm kind="CUSTOM_ITEM" campaigns={memberships.map((membership) => membership.campaign)} characters={characters} />
        <Card>
          <h2 className="text-xl font-bold text-white">Image upload flow</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Save an item draft first, then use the image uploader on the homebrew portfolio or approval card to attach Blob-hosted artwork. Full AI image generation remains planned.
          </p>
        </Card>
      </div>
    </main>
  );
}
