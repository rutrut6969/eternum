import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function CampaignsPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <Badge tone="gold">DM Tools</Badge>
      <h1 className="mt-5 text-4xl font-black text-white">Campaigns</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {["Invites", "Session Notes", "Settings"].map((title) => (
          <Card key={title}>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Data model and dashboard shell are ready for the next implementation pass.</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
