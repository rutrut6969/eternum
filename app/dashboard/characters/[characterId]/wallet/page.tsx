import { notFound, redirect } from "next/navigation";
import { WalletCard } from "@/components/currency/wallet-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { ensureCharacterWallet } from "@/lib/currency/transactions";
import { prisma } from "@/lib/prisma";

export default async function CharacterWalletPage({ params }: { params: Promise<{ characterId: string }> }) {
  const user = await requireUser();
  const { characterId } = await params;
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      campaign: { include: { members: true } },
      currencyTransactions: { orderBy: { createdAt: "desc" }, take: 30 }
    }
  });
  if (!character) notFound();

  const membership = character.campaign?.members.find((member) => member.userId === user.id);
  const canView = character.ownerId === user.id || Boolean(membership && hasDmPermission(membership.roles));
  if (!canView) redirect("/dashboard/characters");

  const wallet = await ensureCharacterWallet(character.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="gold">Currency</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">{character.name} wallet</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        Currency is stored internally as copper pieces and displayed as PP, GP, EP, SP, and CP for table play.
      </p>
      <section className="mt-8">
        <WalletCard characterName={character.name} balanceCp={wallet.balanceCp} transactions={character.currencyTransactions} />
      </section>
      <section className="mt-5">
        <Card>
          <h2 className="text-xl font-bold text-white">Transfer tools</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Transfer and split UI is planned on top of the new `/api/currency/transfer` and `/api/currency/split` endpoints.</p>
        </Card>
      </section>
    </main>
  );
}

