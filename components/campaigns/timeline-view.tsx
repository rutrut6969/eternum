import type { TimelineEvent } from "@/lib/timeline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <h2 className="text-2xl font-bold text-white">Campaign timeline</h2>
      <div className="mt-5 grid gap-3">
        {events.length === 0 ? <p className="text-sm text-zinc-300">No timeline events yet.</p> : null}
        {events.map((event) => (
          <div key={`${event.kind}-${event.id}`} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone={event.tone}>{event.kind}</Badge>
                <h3 className="mt-2 font-bold text-white">{event.title}</h3>
              </div>
              <p className="text-xs text-zinc-500">{event.occurredAt.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
