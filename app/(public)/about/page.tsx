import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="crimson">Vision</Badge>
      <h1 className="mt-5 max-w-4xl text-4xl font-black text-white md:text-6xl">Creative freedom with mechanical trust.</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {[
          ["For players", "Write a backstory, craft strange relics, bend spells through mana, and submit ideas without needing to be a balance designer."],
          ["For DMs", "Review every campaign-impacting change, reveal rolls on your terms, and keep session notes, invites, approvals, and settings in one place."],
          ["For the table", "Use SRD-compatible foundations while growing an Eternum library of disciplines, professions, items, spells, monsters, and lore."]
        ].map(([title, copy]) => (
          <Card key={title}>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{copy}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
