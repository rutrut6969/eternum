import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-lg border border-white/10 bg-charcoal/78 p-5 shadow-ember backdrop-blur", className)}>{children}</section>;
}
