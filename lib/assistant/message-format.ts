import type { AssistantMessage } from "@prisma/client";

export const assistantInputLimits = {
  maxStoredCharacters: 50000,
  warningCharacters: 12000,
  maxOpenAICharacters: 14000,
  maxHistoryMessageCharacters: 2500
};

export function validateAssistantUserMessage(message: string) {
  const normalized = message.replace(/\0/g, "").trim();
  if (normalized.length < 2) return { valid: false as const, message: "Write at least a couple characters for the assistant." };
  if (normalized.length > assistantInputLimits.maxStoredCharacters) {
    return {
      valid: false as const,
      message: `That message is too large for one assistant request. Keep it under ${assistantInputLimits.maxStoredCharacters.toLocaleString()} characters or split it into sections.`
    };
  }
  return {
    valid: true as const,
    message: normalized,
    warning: normalized.length > assistantInputLimits.warningCharacters
      ? "Large source text detected. Eternum will send a condensed version to AI while preserving your full message in the thread."
      : undefined
  };
}

export function compactForModel(content: string, limit = assistantInputLimits.maxOpenAICharacters) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  const head = normalized.slice(0, Math.floor(limit * 0.62));
  const tail = normalized.slice(-Math.floor(limit * 0.28));
  return `${head}\n\n[Large source text condensed by Eternum. Middle content omitted from the AI request but preserved in the stored thread.]\n\n${tail}`;
}

export function openAIMessagesFromHistory(messages: Pick<AssistantMessage, "role" | "content">[]) {
  return messages
    .filter((message) => (message.role === "USER" || message.role === "ASSISTANT") && message.content.trim().length > 0)
    .slice(-8)
    .map((message) => ({
      role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: compactForModel(message.content, assistantInputLimits.maxHistoryMessageCharacters)
    }))
    .filter((message) => message.content.trim().length > 0);
}

export function safeAssistantSummary(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "I drafted a structured suggestion. Review it before saving anything to a campaign.";
}
