type TimelineInput = {
  sessions?: Array<{ id: string; title: string; createdAt: Date; startedAt?: Date | null; endedAt?: Date | null; status: string }>;
  notes?: Array<{ id: string; title: string; createdAt: Date; visibility: string }>;
  activities?: Array<{ id: string; type: string; createdAt: Date; metadata?: unknown }>;
  milestones?: Array<{ id: string; title: string; type: string; createdAt: Date }>;
};

export type TimelineEvent = {
  id: string;
  kind: "session" | "note" | "activity" | "milestone";
  title: string;
  occurredAt: Date;
  tone: "gold" | "mana" | "violet" | "stamina" | "crimson";
  metadata?: unknown;
};

export function buildCampaignTimeline(input: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...(input.sessions ?? []).map((session) => ({
      id: session.id,
      kind: "session" as const,
      title: session.title,
      occurredAt: session.startedAt ?? session.endedAt ?? session.createdAt,
      tone: session.status === "ACTIVE" ? ("stamina" as const) : ("gold" as const),
      metadata: { status: session.status }
    })),
    ...(input.notes ?? []).map((note) => ({
      id: note.id,
      kind: "note" as const,
      title: note.title,
      occurredAt: note.createdAt,
      tone: note.visibility === "DM_ONLY" ? ("crimson" as const) : ("mana" as const)
    })),
    ...(input.activities ?? []).map((activity) => ({
      id: activity.id,
      kind: "activity" as const,
      title: activity.type.replace(/_/g, " ").toLowerCase(),
      occurredAt: activity.createdAt,
      tone: "violet" as const,
      metadata: activity.metadata
    })),
    ...(input.milestones ?? []).map((milestone) => ({
      id: milestone.id,
      kind: "milestone" as const,
      title: milestone.title,
      occurredAt: milestone.createdAt,
      tone: "stamina" as const,
      metadata: { type: milestone.type }
    }))
  ];

  return events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
