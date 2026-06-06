import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-lg border border-white/10 bg-charcoal/70 p-5 shadow-lg shadow-black/20 backdrop-blur", className)}>{children}</section>;
}
