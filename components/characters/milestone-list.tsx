import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Milestone = { id: string; title: string; type: string; createdAt: string };

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  return (
    <Card>
      <h2 className="text-2xl font-bold text-white">Character milestones</h2>
      <div className="mt-5 grid gap-3">
        {milestones.length === 0 ? <p className="text-sm text-zinc-300">No milestones recorded yet.</p> : null}
        {milestones.map((milestone) => (
          <div key={milestone.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <Badge tone="stamina">{milestone.type.replace(/_/g, " ")}</Badge>
            <h3 className="mt-2 font-bold text-white">{milestone.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{new Date(milestone.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
