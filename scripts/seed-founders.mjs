import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultFounderIdentifiers = ["plagueformula"];

function parseFounderIdentifiers() {
  const raw = process.env.FOUNDER_ACCOUNTS;
  const identifiers = raw
    ? raw.split(",").map((value) => value.trim()).filter(Boolean)
    : defaultFounderIdentifiers;

  return [...new Set(identifiers.map((value) => value.toLowerCase()))];
}

function displayIdentifier(identifier) {
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return identifier;
}

async function ensureFounderPlan() {
  return prisma.subscriptionPlan.upsert({
    where: { code: "FOUNDER" },
    update: {
      name: "Founder",
      description: "Max-tier lifetime founder access.",
      active: true,
      sortOrder: 100,
      features: {
        dmTools: true,
        campaigns: true,
        advancedAi: true,
        publicHomebrew: true,
        mapGeneration: true,
        discord: true,
        lifetimeAccess: true
      }
    },
    create: {
      code: "FOUNDER",
      name: "Founder",
      description: "Max-tier lifetime founder access.",
      monthlyPriceCents: 0,
      active: true,
      sortOrder: 100,
      features: {
        dmTools: true,
        campaigns: true,
        advancedAi: true,
        publicHomebrew: true,
        mapGeneration: true,
        discord: true,
        lifetimeAccess: true
      }
    }
  });
}

async function main() {
  const identifiers = parseFounderIdentifiers();
  const founderPlan = await ensureFounderPlan();
  const now = new Date();

  console.log(`Founder seed starting for ${identifiers.length} identifier(s).`);

  for (const identifier of identifiers) {
    const user = await prisma.user.findFirst({
      where: identifier.includes("@")
        ? { email: identifier }
        : { username: identifier }
    });

    if (!user) {
      console.log(`Skipped missing account: ${displayIdentifier(identifier)}`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isFounder: true,
        founderSince: user.founderSince ?? now,
        emailVerified: user.emailVerified ?? now,
        globalRoles: { set: ["PLAYER", "DM"] },
        ...(user.username === "plagueformula" ? { name: "PlageFormula", displayUsername: "plagueformula" } : {})
      }
    });

    const existing = await prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
        planId: founderPlan.id,
        status: { in: ["ACTIVE", "TRIALING"] }
      }
    });

    const subscription = existing
      ? await prisma.userSubscription.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", expiresAt: null }
      })
      : await prisma.userSubscription.create({
        data: {
          userId: user.id,
          planId: founderPlan.id,
          status: "ACTIVE",
          startedAt: now,
          expiresAt: null
        }
      });

    await prisma.billingEvent.create({
      data: {
        userId: user.id,
        userSubscriptionId: subscription.id,
        type: "MANUAL_ADJUSTMENT",
        provider: "internal",
        payload: {
          action: "seed_founder",
          plan: "FOUNDER",
          identifier: displayIdentifier(identifier)
        }
      }
    });

    console.log(`Updated founder account: ${user.username}`);
  }

  console.log("Founder seed complete.");
}

main()
  .catch((error) => {
    console.error("Founder seed failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
