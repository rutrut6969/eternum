import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Activity = {
  id: string;
  type: string;
  createdAt: string;
  metadata: unknown;
  actor: { name: string | null; username: string } | null;
};

export function ActivityFeed({ activities, title = "Recent activity" }: { activities: Activity[]; title?: string }) {
  return (
    <Card>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {activities.length === 0 ? <p className="text-sm text-zinc-300">No activity yet.</p> : null}
        {activities.map((activity) => (
          <div key={activity.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone="violet">{activity.type.replace(/_/g, " ")}</Badge>
                <p className="mt-2 text-sm text-zinc-300">By {activity.actor?.name || activity.actor?.username || "System"}</p>
              </div>
              <p className="text-xs text-zinc-500">{new Date(activity.createdAt).toLocaleString()}</p>
            </div>
            <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-black/30 p-2 text-xs text-zinc-400">{JSON.stringify(activity.metadata, null, 2)}</pre>
          </div>
        ))}
      </div>
    </Card>
  );
}
