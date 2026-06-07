import type { AssistantWorkflowType } from "@prisma/client";

export type AssistantIntent = {
  type: AssistantWorkflowType;
  label: string;
  currentStep: string;
  targetType?: string;
};

const intents: AssistantIntent[] = [
  { type: "SPELL_DRAFT", label: "Spell draft", currentStep: "spell_intake", targetType: "homebrew_spell" },
  { type: "ITEM_DRAFT", label: "Item draft", currentStep: "item_intake", targetType: "homebrew_item" },
  { type: "CHARACTER_HELP", label: "Character help", currentStep: "character_intake", targetType: "character" },
  { type: "NPC_DRAFT", label: "NPC draft", currentStep: "npc_intake", targetType: "homebrew_npc" },
  { type: "MONSTER_DRAFT", label: "Monster draft", currentStep: "monster_intake", targetType: "homebrew_monster" },
  { type: "QUEST_DRAFT", label: "Quest draft", currentStep: "quest_intake", targetType: "quest" },
  { type: "COMPENDIUM_HELP", label: "Compendium help", currentStep: "compendium_intake", targetType: "compendium" },
  { type: "MAP_BLUEPRINT", label: "Map blueprint", currentStep: "map_intake", targetType: "map" },
  { type: "RULE_EXPLANATION", label: "Rule explanation", currentStep: "rule_explanation", targetType: "rules" }
];

export function classifyAssistantIntent(message: string): AssistantIntent {
  const text = message.toLowerCase();
  if (/\b(spell|cantrip|ritual|mana|cast|infusion)\b/.test(text)) return intents[0];
  if (/\b(item|weapon|armor|relic|artifact|potion|craft|crafted)\b/.test(text)) return intents[1];
  if (/\b(character|backstory|ancestry|profession|trait|flaw|affinity|build me|create a hero)\b/.test(text)) return intents[2];
  if (/\b(npc|shopkeeper|villain|ally|faction leader|merchant)\b/.test(text)) return intents[3];
  if (/\b(monster|creature|stat block|boss|enemy|encounter creature)\b/.test(text)) return intents[4];
  if (/\b(quest|hook|objective|adventure|mission|rumor)\b/.test(text)) return intents[5];
  if (/\b(compendium|ruleset|module|pack|lore entry)\b/.test(text)) return intents[6];
  if (/\b(map|dungeon|crypt|battlemap|battle map|room|corridor)\b/.test(text)) return intents[7];
  if (/\b(rule|explain|how does|mana|stamina|profession xp|necromancy)\b/.test(text)) return intents[8];
  return { type: "GENERAL", label: "General assistant", currentStep: "intake" };
}

export function assistantSystemPrompt(intent: AssistantIntent) {
  return `You are the unified Eternum VTT assistant.
Return strict JSON with:
{
  "summary": string,
  "intent": "${intent.type}",
  "questions": string[],
  "suggestedNextActions": string[],
  "structuredDraft": object,
  "rulesEngineNotes": string[],
  "dmApprovalRequired": boolean
}

Core rule: AI Suggestion -> Rules Engine Calculation -> DM Approval -> Saved Content.
AI never finalizes mechanics, balance, legality, prices, mana costs, DCs, XP, or campaign usability.
Use original Eternum content only. Do not import proprietary non-SRD copyrighted material.
For NPC and monster requests, provide a draft outline only; full NPC/monster workflow is coming next.
For map requests, suggest an editable structured blueprint workflow, not a flat image.
For rules explanations, be concise and mention when a DM can override.`;
}

