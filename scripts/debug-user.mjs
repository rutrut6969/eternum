import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const identifier = process.argv[2]?.trim().toLowerCase();

const activeStatuses = ["ACTIVE", "TRIALING"];

const planFeatures = {
  FREE: { campaigns: true, dmTools: false, publicHomebrew: true },
  DM: { campaigns: true, dmTools: true, publicHomebrew: true },
  WORLDBUILDER: { campaigns: true, dmTools: true, publicHomebrew: true },
  FOUNDER: { campaigns: true, dmTools: true, publicHomebrew: true }
};

async function currentPlan(user) {
  if (user.isFounder) return "FOUNDER";
  const sub = user.subscriptions.find((item) => activeStatuses.includes(item.status) && (!item.expiresAt || item.expiresAt > new Date()));
  return sub?.plan.code ?? "FREE";
}

async function main() {
  if (!identifier) {
    console.log("Usage: npm run debug:user -- email@example.com-or-username");
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
        { displayUsername: { equals: identifier, mode: "insensitive" } }
      ]
    },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" } }
    }
  });
  if (!user) {
    console.log(`User not found: ${identifier}`);
    return;
  }

  const plan = await currentPlan(user);
  const subscription = user.subscriptions[0];
  console.log({
    email: user.email,
    username: user.username,
    displayUsername: user.displayUsername,
    emailVerified: Boolean(user.emailVerified),
    isFounder: user.isFounder,
    founderSince: user.founderSince,
    subscriptionPlan: subscription?.plan.code ?? "FREE",
    subscriptionStatus: subscription?.status ?? "none",
    subscriptionSource: subscription?.source ?? "none",
    effectivePlan: plan,
    canCreateCampaign: planFeatures[plan].campaigns,
    canAccessDmTools: planFeatures[plan].dmTools,
    canPublishPublicHomebrew: planFeatures[plan].publicHomebrew
  });
}

main()
  .catch((error) => {
    console.error("User debug failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
