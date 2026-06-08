import { describe, expect, it } from "vitest";
import { createEmailVerificationToken, isVerificationTokenExpired } from "@/lib/auth/email-verification";
import { usernameFromDisplayName, validateUsername } from "@/lib/auth/validation";
import { assistantSystemPrompt, classifyAssistantIntent } from "@/lib/assistant/intents";
import { compactForModel, validateAssistantUserMessage } from "@/lib/assistant/message-format";
import { formatCurrency, fromCopper, splitCopper, toCopper } from "@/lib/currency/conversion";
import crypto from "node:crypto";
import { getInviteStatus } from "@/lib/invites";
import { homebrewSubmissionSnapshot } from "@/lib/homebrew-submissions";
import { blueprintToMapLayers, createBlankMapBlueprint, validateMapBlueprint } from "@/lib/maps/blueprint-schema";
import { buildEditableMapBlueprintPrompt, buildTopDownBattleMapPrompt } from "@/lib/maps/prompt-templates";
import { wouldRemoveFinalDm } from "@/lib/member-roles";
import { milestoneForGameplayChange, professionMilestone } from "@/lib/milestones";
import { transitionSessionStatus } from "@/lib/sessions";
import { buildCampaignTimeline } from "@/lib/timeline";
import { maxImageSizeBytes, validateImageUpload } from "@/lib/uploads";
import { getSquareConfig, verifySquareWebhookSignature } from "@/lib/billing/square";
import { priceCraftedItem } from "@/lib/rules/pricing";

describe("campaign session transitions", () => {
  it("starts and completes sessions in order", () => {
    expect(transitionSessionStatus("PLANNED", "start")).toBe("ACTIVE");
    expect(transitionSessionStatus("ACTIVE", "end")).toBe("COMPLETED");
  });

  it("rejects invalid status transitions", () => {
    expect(() => transitionSessionStatus("COMPLETED", "start")).toThrow("Cannot start");
  });
});

describe("timeline generation", () => {
  it("sorts mixed campaign events newest first", () => {
    const events = buildCampaignTimeline({
      sessions: [{ id: "s1", title: "Opening", status: "COMPLETED", createdAt: new Date("2026-01-01") }],
      activities: [{ id: "a1", type: "DICE_ROLLED", createdAt: new Date("2026-01-03"), metadata: { total: 20 } }],
      milestones: [{ id: "m1", title: "Learned Spark", type: "SPELL_LEARNED", createdAt: new Date("2026-01-02") }]
    });

    expect(events.map((event) => event.id)).toEqual(["a1", "m1", "s1"]);
  });
});

describe("character milestones", () => {
  it("creates milestones for learned spells and professions", () => {
    expect(milestoneForGameplayChange("learnedSpells", { name: "Moonfire" })?.type).toBe("SPELL_LEARNED");
    expect(professionMilestone("Alchemy", 3)).toMatchObject({ type: "PROFESSION_LEVEL_GAINED", title: "Alchemy reached level 3" });
  });
});

describe("invite token handling", () => {
  it("classifies expired, used, invalid, and active invites", () => {
    expect(getInviteStatus(null)).toBe("invalid");
    expect(getInviteStatus({ status: "ACCEPTED", expiresAt: new Date(Date.now() + 10000) } as never)).toBe("used");
    expect(getInviteStatus({ status: "PENDING", expiresAt: new Date(Date.now() - 10000) } as never)).toBe("expired");
    expect(getInviteStatus({ status: "PENDING", expiresAt: new Date(Date.now() + 10000) } as never)).toBe("active");
  });
});

describe("member role safety", () => {
  it("prevents removing the final DM role from self", () => {
    const target = { id: "m1", userId: "u1", roles: ["DM"] };
    expect(wouldRemoveFinalDm({ actingUserId: "u1", target: target as never, allMembers: [target as never], nextRoles: ["PLAYER"] as never })).toBe(true);
  });

  it("allows removing DM when another DM exists", () => {
    const target = { id: "m1", userId: "u1", roles: ["DM"] };
    const other = { id: "m2", roles: ["DM"] };
    expect(wouldRemoveFinalDm({ actingUserId: "u1", target: target as never, allMembers: [target as never, other as never], nextRoles: ["PLAYER"] as never })).toBe(false);
  });
});

describe("blob upload validation", () => {
  it("accepts supported images and rejects large files", () => {
    const valid = new File(["x"], "item.png", { type: "image/png" });
    const large = new File([new Uint8Array(maxImageSizeBytes + 1)], "big.png", { type: "image/png" });

    expect(validateImageUpload(valid).valid).toBe(true);
    expect(validateImageUpload(large).valid).toBe(false);
  });
});

describe("email verification tokens", () => {
  it("generates secure-looking tokens and identifies expiry", () => {
    const verification = createEmailVerificationToken();
    expect(verification.token).toHaveLength(64);
    expect(isVerificationTokenExpired(new Date(Date.now() - 1))).toBe(true);
    expect(isVerificationTokenExpired(verification.expires)).toBe(false);
  });
});

describe("username creation", () => {
  it("generates normalized usernames from display names", () => {
    expect(usernameFromDisplayName("Isaac Rutledge")).toBe("isaac_rutledge");
    expect(usernameFromDisplayName("  Arcane  Knight!!!  ")).toBe("arcane_knight");
    expect(usernameFromDisplayName("This Name Is Way Too Long For A Username")).toHaveLength(24);
  });

  it("keeps server-side username validation strict", () => {
    expect(validateUsername("valid_name_123").valid).toBe(true);
    expect(validateUsername("bad name").valid).toBe(false);
  });
});

describe("AI map prompt templates", () => {
  it("enforces top-down VTT battle map constraints", () => {
    const prompt = buildTopDownBattleMapPrompt({ prompt: "ruined chapel in a cursed forest", gridType: "square", width: 30, height: 30 });

    expect(prompt).toContain("top-down");
    expect(prompt).toContain("Do not include text labels");
    expect(prompt).toContain("grid-friendly");
  });

  it("enforces editable blueprint output before image generation", () => {
    const prompt = buildEditableMapBlueprintPrompt({ prompt: "ruined goblin crypt with five rooms", width: 30, height: 30 });

    expect(prompt).toContain("strict JSON only");
    expect(prompt).toContain("Do not create an image");
    expect(prompt).toContain("Allowed MapElement types");
    expect(prompt).toContain("square 30 by 30");
  });
});

describe("editable map blueprints", () => {
  it("validates blank manual blueprints and converts them to layer data", () => {
    const blueprint = createBlankMapBlueprint({ name: "Training Hall", width: 24, height: 18 });
    const validation = validateMapBlueprint(blueprint);

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      const layers = blueprintToMapLayers(validation.blueprint);
      expect(layers[0]).toMatchObject({ name: "Base", data: { elements: [] } });
    }
  });

  it("rejects elements outside the grid", () => {
    const validation = validateMapBlueprint({
      version: 1,
      name: "Broken Map",
      grid: { type: "square", width: 10, height: 10 },
      layers: [
        {
          name: "Base",
          order: 0,
          visible: true,
          locked: false,
          elements: [{ id: "room_1", type: "room", bounds: { x: 8, y: 8, width: 5, height: 5 }, visibility: "DM_ONLY", metadata: {} }]
        }
      ]
    });

    expect(validation.valid).toBe(false);
  });

  it("keeps clone-ready editor metadata separate from layer geometry", () => {
    const blueprint = createBlankMapBlueprint({ name: "Clone Source" });
    const layers = blueprintToMapLayers(blueprint);
    const editorState = { zoom: 1, pan: { x: 0, y: 0 }, selectedTool: "select", showGrid: true };

    expect(layers[0].data.elements).toEqual([]);
    expect(editorState).toMatchObject({ selectedTool: "select", showGrid: true });
  });
});

describe("unified assistant routing", () => {
  it("classifies common creator intents", () => {
    expect(classifyAssistantIntent("Help me make a shadow spell").type).toBe("SPELL_DRAFT");
    expect(classifyAssistantIntent("Create an NPC merchant with secrets").type).toBe("NPC_DRAFT");
    expect(classifyAssistantIntent("Roleplay as the tavern keeper").type).toBe("NPC_ROLEPLAY");
    expect(classifyAssistantIntent("Build a ruined crypt map").type).toBe("MAP_BLUEPRINT");
    expect(classifyAssistantIntent("Split the gold among the party").type).toBe("CURRENCY_HELP");
    expect(classifyAssistantIntent("Kaelen claims the loot").type).toBe("LOOT_UPDATE");
    expect(classifyAssistantIntent("Create a city guild and faction conflict").type).toBe("WORLDBUILDING");
    expect(classifyAssistantIntent("Price this crafted sword for a merchant").type).toBe("CRAFTING_HELP");
    expect(classifyAssistantIntent("Start listening to this session").type).toBe("SESSION_LISTENER");
    expect(classifyAssistantIntent("Summarize this session").type).toBe("SESSION_MEMORY");
    expect(classifyAssistantIntent("What happened last session?").type).toBe("CAMPAIGN_MEMORY_QUERY");
    expect(classifyAssistantIntent("Explain stamina recovery").type).toBe("RULE_EXPLANATION");
  });

  it("keeps assistant prompts suggestion-only", () => {
    const prompt = assistantSystemPrompt(classifyAssistantIntent("make a monster"));

    expect(prompt).toContain("Rules Engine Calculation");
    expect(prompt).toContain("AI never finalizes mechanics");
    expect(prompt).toContain("strict JSON");
  });
});

describe("assistant large message formatting", () => {
  it("validates and compacts long messages without becoming empty", () => {
    const long = "ancient lore ".repeat(2000);
    const validation = validateAssistantUserMessage(long);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.warning).toContain("Large source text");
      const compacted = compactForModel(validation.message, 1000);
      expect(compacted.length).toBeLessThanOrEqual(1200);
      expect(compacted).toContain("Large source text condensed");
    }
  });
});

describe("currency conversion", () => {
  it("uses copper as the base unit", () => {
    expect(toCopper({ pp: 1, gp: 2, ep: 1, sp: 3, cp: 4 })).toBe(1284);
    expect(fromCopper(1284)).toEqual({ pp: 1, gp: 2, ep: 1, sp: 3, cp: 4 });
    expect(formatCurrency(1284)).toBe("1 PP 2 GP 1 EP 3 SP 4 CP");
  });

  it("splits currency with an explicit remainder", () => {
    expect(splitCopper(101, 4)).toEqual({ share: 25, remainder: 1 });
  });
});

describe("crafted item pricing", () => {
  it("calculates copper values and merchant prices deterministically", () => {
    const pricing = priceCraftedItem({
      materialCostCopper: 100,
      professionLevel: 4,
      rarity: "uncommon",
      enchantmentCount: 1,
      demandModifier: 0.1
    });

    expect(pricing.baseValueCopper).toBeGreaterThan(100);
    expect(pricing.merchantBuyCopper).toBeLessThan(pricing.baseValueCopper);
    expect(pricing.merchantSellCopper).toBeGreaterThan(pricing.baseValueCopper);
    expect(pricing.display.baseValue).toMatch(/CP|SP|GP|PP/);
  });
});

describe("homebrew submission lifecycle", () => {
  it("captures character-linked submission snapshots for revision history", () => {
    const snapshot = homebrewSubmissionSnapshot({
      type: "CUSTOM_SPELL",
      title: "Ashen Ward",
      summary: "A defensive fire charm",
      body: { name: "Ashen Ward", characterId: "char_1" },
      rulesResult: { manaCost: 10, balanceNotes: ["DM approval required"] },
      rarity: null,
      discipline: "Elemental",
      professionRequirements: [],
      imageUrl: null,
      imagePrompt: null,
      imageAltText: null,
      generatedByAi: true,
      status: "PENDING_DM_REVIEW",
      visibility: "CAMPAIGN_ONLY",
      campaignId: "camp_1",
      characterId: "char_1"
    });

    expect(snapshot).toMatchObject({
      type: "CUSTOM_SPELL",
      title: "Ashen Ward",
      status: "PENDING_DM_REVIEW",
      campaignId: "camp_1",
      characterId: "char_1",
      generatedByAi: true
    });
  });
});

describe("square billing helpers", () => {
  it("selects sandbox by default and verifies webhook signatures", () => {
    const previousEnv = process.env.SQUARE_ENVIRONMENT;
    const previousKey = process.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY;
    process.env.SQUARE_ENVIRONMENT = "sandbox";
    process.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY = "test-signature-key";

    const config = getSquareConfig();
    const notificationUrl = "https://example.com/api/billing/square/webhook";
    const rawBody = JSON.stringify({ type: "payment.created" });
    const signature = crypto.createHmac("sha256", "test-signature-key").update(notificationUrl + rawBody).digest("base64");

    expect(config.environment).toBe("sandbox");
    expect(verifySquareWebhookSignature({ notificationUrl, rawBody, signature })).toBe(true);
    expect(verifySquareWebhookSignature({ notificationUrl, rawBody, signature: "bad" })).toBe(false);

    process.env.SQUARE_ENVIRONMENT = previousEnv;
    process.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY = previousKey;
  });
});
