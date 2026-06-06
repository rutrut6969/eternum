import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";

export async function getHeaderContext() {
  const session = await getServerSession(authOptions);
  const account = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          email: true,
          emailVerified: true,
          isFounder: true,
          globalRoles: true
        }
      })
    : null;

  const canAccessDmTools = account ? await subscriptionService.canAccessDmTools(account.id) : false;
  const notificationCount = account
    ? (account.emailVerified ? 0 : 1) +
      await prisma.approvalRequest.count({
        where: {
          status: "PENDING_DM_REVIEW",
          campaign: { members: { some: { userId: account.id, roles: { hasSome: ["DM", "ASSISTANT_DM"] } } } }
        }
      }) +
      await prisma.campaignInvite.count({
        where: {
          status: "PENDING",
          email: account.email,
          expiresAt: { gt: new Date() }
        }
      })
    : 0;

  return {
    account,
    notificationCount,
    showDmTools: canAccessDmTools || account?.globalRoles.includes("DM") === true
  };
}
