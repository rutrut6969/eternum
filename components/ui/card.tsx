import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-lg border border-white/10 bg-charcoal/68 p-4 shadow-md shadow-black/15 backdrop-blur sm:p-5", className)}>{children}</section>;
}
