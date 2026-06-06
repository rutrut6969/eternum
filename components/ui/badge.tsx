import { clsx } from "clsx";

const tones = {
  gold: "border-aureate/40 bg-aureate/10 text-aureate",
  mana: "border-mana/40 bg-mana/10 text-mana",
  violet: "border-violet/40 bg-violet/10 text-violet",
  crimson: "border-crimson/40 bg-crimson/10 text-crimson",
  stamina: "border-stamina/40 bg-stamina/10 text-stamina"
};

export function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={clsx("inline-flex rounded-full border px-3 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}
