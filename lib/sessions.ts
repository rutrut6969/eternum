export type SessionStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export function transitionSessionStatus(current: SessionStatus, action: "start" | "end" | "archive") {
  if (action === "archive") return "ARCHIVED";
  if (action === "start" && current === "PLANNED") return "ACTIVE";
  if (action === "end" && current === "ACTIVE") return "COMPLETED";
  throw new Error(`Cannot ${action} a ${current.toLowerCase()} session.`);
}

export function nextSessionTimestamps(action: "start" | "end" | "archive", now = new Date()) {
  return {
    startedAt: action === "start" ? now : undefined,
    endedAt: action === "end" ? now : undefined
  };
}
