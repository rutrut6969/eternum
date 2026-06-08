import Link from "next/link";
import { EmailStatusCard } from "@/components/account/email-status-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { reconcileUserSubscription } from "@/lib/subscriptions/reconciliation";
import { subscriptionService } from "@/lib/subscriptions/service";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const latestSubscription = await prisma.userSubscription.findFirst({
    where: { userId: sessionUser.id, squareSubscriptionId: { not: null } },
    orderBy: { startedAt: "desc" }
  });
  if (latestSubscription?.squareSubscriptionId) {
    await reconcileUserSubscription(latestSubscription.id).catch(() => null);
  }
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" }, take: 1 },
      aiUsage: { orderBy: { month: "desc" }, take: 3 }
    }
  });
  if (!user) return null;
  const planCode = await subscriptionService.getCurrentPlanCode(user.id);
  const subscription = user.subscriptions[0];
  const showDebugBilling = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_BILLING_DEBUG === "true";
  const awaitingSquare = subscription?.source === "SQUARE" && subscription.status === "PAUSED" && !subscription.squareSubscriptionId;

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="gold">Account</Badge>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Account workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">Profile, verification, subscriptions, linked accounts, and future billing tools.</p>
        </div>
        {user.isFounder ? <Badge tone="gold">Founder / Max Tier / Lifetime Access</Badge> : null}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <p className="rounded-md bg-black/25 p-2.5"><span className="text-zinc-500">Display name</span><span className="mt-1 block font-semibold text-white">{user.name || "Not set"}</span></p>
            <p className="rounded-md bg-black/25 p-2.5"><span className="text-zinc-500">Username</span><span className="mt-1 block font-semibold text-white">@{user.username}</span></p>
            <p className="rounded-md bg-black/25 p-2.5"><span className="text-zinc-500">Email</span><span className="mt-1 block font-semibold text-white">{user.email}</span></p>
          </div>
        </Card>
        <EmailStatusCard email={user.email} verified={Boolean(user.emailVerified)} />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Subscription</h2>
            <Badge tone={planCode === "FOUNDER" ? "gold" : "mana"}>{planCode === "FOUNDER" ? "Founder" : planCode}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Square checkout is configured for one-time Founder purchases and recurring DM/Worldbuilder subscriptions. Access changes after Square confirms the payment or subscription webhook.</p>
          {awaitingSquare ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-2 text-sm text-mana">Checkout started. Waiting for Square to confirm the subscription webhook.</p> : null}
          {user.isFounder ? <p className="mt-3 rounded-md border border-aureate/20 bg-aureate/10 p-2 text-sm text-aureate">Max Tier / Lifetime Access</p> : null}
          <div className="mt-4 grid gap-2 text-sm text-zinc-300">
            <p>Status: <span className="text-white">{subscription?.status ?? "FREE"}</span></p>
            <p>Source: <span className="text-white">{subscription?.source ?? (user.isFounder ? "FOUNDER" : "N/A")}</span></p>
            <p>Started: <span className="text-white">{subscription?.startedAt ? subscription.startedAt.toLocaleDateString() : "N/A"}</span></p>
            <p>Current period end: <span className="text-white">{subscription?.currentPeriodEnd ? subscription.currentPeriodEnd.toLocaleDateString() : "N/A"}</span></p>
            <p>Expires: <span className="text-white">{user.isFounder ? "Lifetime" : subscription?.expiresAt ? subscription.expiresAt.toLocaleDateString() : "N/A"}</span></p>
            <p>Square customer: <span className="text-white">{subscription?.squareCustomerId ? "Connected" : "Not connected"}</span></p>
            {showDebugBilling && subscription?.squareSubscriptionId ? <p>Square subscription ID: <span className="break-all text-white">{subscription.squareSubscriptionId}</span></p> : null}
          </div>
          <Link className="mt-5 inline-flex rounded-md border border-aureate/30 px-4 py-3 text-sm font-semibold text-aureate hover:bg-aureate/10" href="/pricing">
            View planned tiers
          </Link>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-white">AI usage</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Monthly AI request counts are tracked for future plan limits and billing analytics.</p>
          <div className="mt-5 grid gap-2">
            {user.aiUsage.length === 0 ? <p className="text-sm text-zinc-500">No AI usage recorded yet.</p> : null}
            {user.aiUsage.map((usage) => (
              <p key={usage.id} className="flex items-center justify-between rounded bg-black/25 p-3 text-sm">
                <span className="text-zinc-300">{usage.month}</span>
                <span className="font-bold text-white">{usage.requestCount} requests</span>
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold text-white">Linked accounts</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">OAuth and Discord account linking are planned after the core gameplay workflows stabilize.</p>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold text-white">Powered by Obsidian Systems LLC</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Eternum Tabletop is built under the Obsidian Systems LLC banner.
          </p>
          <Link className="mt-5 inline-flex text-sm font-semibold text-mana" href="https://obsidian-systems.tech">
            obsidian-systems.tech
          </Link>
        </Card>
      </section>
    </main>
  );
}
