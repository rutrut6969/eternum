import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { BrandFooter } from "@/components/layout/brand-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eternum Tabletop",
  description: "A dark fantasy campaign manager and Eternum rules engine for D&D-compatible play."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="arcane-grid flex min-h-screen flex-col">
          <SiteHeader
            account={account ? { name: account.name, username: account.username, image: account.image, isFounder: account.isFounder } : null}
            notificationCount={notificationCount}
            showDmTools={canAccessDmTools || account?.globalRoles.includes("DM") === true}
          />
          <div className="flex-1">{children}</div>
          <BrandFooter />
        </div>
      </body>
    </html>
  );
}
