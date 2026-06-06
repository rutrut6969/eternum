import Link from "next/link";
import { getServerSession } from "next-auth";
import { InviteLandingActions } from "@/components/campaigns/invite-landing-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth/options";
import { getInviteStatus } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  const invite = await prisma.campaignInvite.findUnique({
    where: { token },
    include: {
      campaign: { select: { name: true, description: true, owner: { select: { name: true, username: true } } } }
    }
  });
  const status = getInviteStatus(invite);
  const callbackUrl = `/invite/${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-56px)] max-w-2xl items-center px-4 py-8 sm:px-5 sm:py-12">
      <Card>
        <Badge tone={status === "active" ? "mana" : "crimson"}>{status}</Badge>
        <h1 className="mt-5 text-3xl font-black text-white">{invite?.campaign.name ?? "Invite unavailable"}</h1>
        {invite?.campaign.description ? <p className="mt-4 text-zinc-300">{invite.campaign.description}</p> : null}
        {invite ? (
          <div className="mt-5 grid gap-3 rounded-md border border-white/10 bg-black/25 p-4 text-sm text-zinc-300">
            <p>DM: {invite.campaign.owner.name || invite.campaign.owner.username}</p>
            <p>Role offered: {invite.roles.join(", ")}</p>
            <p>Expires: {invite.expiresAt.toLocaleString()}</p>
          </div>
        ) : null}

        {status === "active" && session?.user?.id ? <InviteLandingActions token={token} /> : null}
        {status === "active" && !session?.user?.id ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="whitespace-nowrap rounded-md bg-aureate px-4 py-3 text-center font-semibold text-void" href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Sign in to accept
            </Link>
            <Link className="whitespace-nowrap rounded-md border border-aureate/30 px-4 py-3 text-center font-semibold text-aureate" href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Register to accept
            </Link>
          </div>
        ) : null}
        {status !== "active" ? <p className="mt-5 text-sm text-zinc-400">This invite is {status}. Ask your DM for a fresh invite if needed.</p> : null}
      </Card>
    </main>
  );
}
