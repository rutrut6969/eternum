import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fromCopper, formatCurrency } from "@/lib/currency/conversion";

export function WalletCard({
  characterName,
  balanceCp,
  transactions = []
}: {
  characterName?: string;
  balanceCp: number;
  transactions?: Array<{ id: string; amountCp: number; type: string; note: string | null; createdAt: Date | string }>;
}) {
  const display = fromCopper(balanceCp);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge tone="gold">Wallet</Badge>
          <h2 className="mt-4 text-2xl font-bold text-white">{characterName ? `${characterName}: ` : ""}{formatCurrency(balanceCp)}</h2>
          <p className="mt-2 text-sm text-zinc-400">Stored internally as {balanceCp} copper pieces.</p>
        </div>
        <div className="grid grid-cols-5 gap-1 text-center text-xs text-zinc-300">
          {(["pp", "gp", "ep", "sp", "cp"] as const).map((denomination) => (
            <div key={denomination} className="rounded-md border border-white/10 bg-black/25 p-2">
              <p className="font-bold text-white">{display[denomination]}</p>
              <p className="uppercase text-zinc-500">{denomination}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        <p className="text-sm font-semibold text-white">Recent changes</p>
        {transactions.length === 0 ? <p className="text-sm text-zinc-500">No currency history yet.</p> : null}
        {transactions.slice(0, 5).map((transaction) => (
          <div key={transaction.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className={transaction.amountCp >= 0 ? "text-stamina" : "text-crimson"}>{transaction.amountCp >= 0 ? "+" : ""}{formatCurrency(Math.abs(transaction.amountCp))}</span>
              <span className="text-xs text-zinc-500">{transaction.type.replace(/_/g, " ").toLowerCase()}</span>
            </div>
            {transaction.note ? <p className="mt-1 text-xs text-zinc-400">{transaction.note}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
