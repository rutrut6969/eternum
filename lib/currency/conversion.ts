export const currencyToCopper = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000
} as const;

export type CurrencyDenomination = keyof typeof currencyToCopper;

export type CurrencyBreakdown = Record<CurrencyDenomination, number>;

export function toCopper(input: Partial<CurrencyBreakdown>) {
  return (Object.entries(input) as Array<[CurrencyDenomination, number | undefined]>).reduce(
    (sum, [denomination, amount]) => sum + Math.trunc(Number(amount ?? 0)) * currencyToCopper[denomination],
    0
  );
}

export function fromCopper(copper: number): CurrencyBreakdown {
  let remaining = Math.max(0, Math.trunc(copper));
  const pp = Math.floor(remaining / currencyToCopper.pp);
  remaining -= pp * currencyToCopper.pp;
  const gp = Math.floor(remaining / currencyToCopper.gp);
  remaining -= gp * currencyToCopper.gp;
  const ep = Math.floor(remaining / currencyToCopper.ep);
  remaining -= ep * currencyToCopper.ep;
  const sp = Math.floor(remaining / currencyToCopper.sp);
  remaining -= sp * currencyToCopper.sp;
  return { pp, gp, ep, sp, cp: remaining };
}

export function formatCurrency(copper: number) {
  const parts = Object.entries(fromCopper(copper))
    .filter(([, amount]) => amount > 0)
    .map(([denomination, amount]) => `${amount} ${denomination.toUpperCase()}`);
  return parts.length ? parts.join(" ") : "0 CP";
}

export function splitCopper(totalCopper: number, recipients: number) {
  const safeRecipients = Math.max(1, Math.trunc(recipients));
  const share = Math.floor(Math.max(0, Math.trunc(totalCopper)) / safeRecipients);
  const remainder = Math.max(0, Math.trunc(totalCopper)) % safeRecipients;
  return { share, remainder };
}

