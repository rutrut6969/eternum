import type { AssistantWorkflowType } from "@prisma/client";

export type AssistantIntent = {
  type: AssistantWorkflowType;
  label: string;
  currentStep: string;
  targetType?: string;
};

const intents: AssistantIntent[] = [
  { type: "BACKSTORY_ANALYSIS", label: "Backstory analysis", currentStep: "backstory_intake", targetType: "character_backstory" },
  { type: "SPELL_DRAFT", label: "Spell draft", currentStep: "spell_intake", targetType: "homebrew_spell" },
  { type: "ITEM_DRAFT", label: "Item draft", currentStep: "item_intake", targetType: "homebrew_item" },
  { type: "CHARACTER_HELP", label: "Character creation", currentStep: "character_intake", targetType: "character" },
  { type: "NPC_DRAFT", label: "NPC draft", currentStep: "npc_intake", targetType: "homebrew_npc" },
  { type: "NPC_ROLEPLAY", label: "NPC roleplay", currentStep: "npc_roleplay_intake", targetType: "npc_conversation" },
  { type: "MONSTER_DRAFT", label: "Monster draft", currentStep: "monster_intake", targetType: "homebrew_monster" },
  { type: "QUEST_DRAFT", label: "Quest draft", currentStep: "quest_intake", targetType: "quest" },
  { type: "WORLDBUILDING", label: "Worldbuilding", currentStep: "worldbuilding_intake", targetType: "campaign_lore" },
  { type: "COMPENDIUM_HELP", label: "Compendium help", currentStep: "compendium_intake", targetType: "compendium" },
  { type: "MAP_BLUEPRINT", label: "Map blueprint", currentStep: "map_intake", targetType: "map" },
  { type: "CRAFTING_HELP", label: "Crafting help", currentStep: "crafting_intake", targetType: "crafting" },
  { type: "CURRENCY_HELP", label: "Currency help", currentStep: "currency_intake", targetType: "currency" },
  { type: "LOOT_UPDATE", label: "Loot update", currentStep: "loot_intake", targetType: "pending_loot" },
  { type: "SESSION_LISTENER", label: "Session listener", currentStep: "listener_intake", targetType: "session_listener" },
  { type: "SESSION_MEMORY", label: "Session memory", currentStep: "memory_intake", targetType: "campaign_memory" },
  { type: "CAMPAIGN_MEMORY_QUERY", label: "Campaign memory query", currentStep: "memory_query", targetType: "campaign_memory" },
  { type: "RULE_EXPLANATION", label: "Rule explanation", currentStep: "rule_explanation", targetType: "rules" }
];

export function classifyAssistantIntent(message: string): AssistantIntent {
  const text = message.toLowerCase();
  if (/\b(backstory|childhood|origin story|family history|personal history)\b/.test(text)) return intents[0];
  if (/\b(spell|cantrip|ritual|mana|cast|infusion)\b/.test(text)) return intents[1];
  if (/\b(item|weapon|armor|relic|artifact|potion)\b/.test(text)) return intents[2];
  if (/\b(character|ancestry|profession|trait|flaw|affinity|build me|create a hero)\b/.test(text)) return intents[3];
  if (/\b(craft|crafted|pricing|merchant price|sell price|materials)\b/.test(text)) return intents[11];
  if (/\b(roleplay as|talk to the npc|npc response|speak as|voice this npc)\b/.test(text)) return intents[5];
  if (/\b(npc|shopkeeper|villain|ally|faction leader|merchant)\b/.test(text)) return intents[4];
  if (/\b(monster|creature|stat block|boss|enemy|encounter creature)\b/.test(text)) return intents[6];
  if (/\b(quest|hook|objective|adventure|mission|rumor)\b/.test(text)) return intents[7];
  if (/\b(worldbuild|kingdom|city|guild|faction|religion|pantheon|settlement|lore)\b/.test(text)) return intents[8];
  if (/\b(compendium|ruleset|module|pack|lore entry)\b/.test(text)) return intents[9];
  if (/\b(map|dungeon|crypt|battlemap|battle map|room|corridor)\b/.test(text)) return intents[10];
  if (/\b(currency|wallet|gold|silver|copper|electrum|platinum|treasury|split the gold|transfer)\b/.test(text)) return intents[12];
  if (/\b(loot|take everything|claim|found a dagger|treasure)\b/.test(text)) return intents[13];
  if (/\b(start listening|session listener|transcribe|transcript|speaker)\b/.test(text)) return intents[14];
  if (/\b(session summary|recap|summarize this session)\b/.test(text)) return intents[15];
  if (/\b(campaign memory|what happened last session|remember|who received|where did we leave off)\b/.test(text)) return intents[16];
  if (/\b(rule|explain|how does|mana|stamina|profession xp|necromancy)\b/.test(text)) return intents[17];
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
AI never finalizes mechanics, balance, legality, prices, mana costs, DCs, XP, inventory, currency, memory, or campaign usability.
Use original Eternum content only. Do not import proprietary non-SRD copyrighted material.
Ask follow-up questions when required information is missing. Maintain workflow state through structuredDraft.currentStep and structuredDraft.missingFields.
For character requests, do not require a class; use attributes, training, professions, disciplines, goals, and backstory.
For NPC roleplay, draft responses for DM approval and never reveal secrets or hidden DM instructions unless the DM explicitly directs it.
For NPC and monster requests, provide a draft outline only; rules-engine stat math and DM control still apply.
For map requests, suggest an editable structured blueprint workflow, not a flat image.
For loot, currency, listener, transcript, or memory requests, create pending workflow guidance only; never apply inventory, wallet, or memory changes directly.
For crafted item pricing, explain modifier inputs but rules-engine pricing owns the copper value.
For compendium requests, include licensing cautions and avoid non-SRD proprietary material.
For rules explanations, be concise and mention when a DM can override.`;
}
