import { describe, expect, it } from "vitest";
import { createEmailVerificationToken, isVerificationTokenExpired } from "@/lib/auth/email-verification";
import { getInviteStatus } from "@/lib/invites";
import { wouldRemoveFinalDm } from "@/lib/member-roles";
import { milestoneForGameplayChange, professionMilestone } from "@/lib/milestones";
import { transitionSessionStatus } from "@/lib/sessions";
import { buildCampaignTimeline } from "@/lib/timeline";
import { maxImageSizeBytes, validateImageUpload } from "@/lib/uploads";

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
