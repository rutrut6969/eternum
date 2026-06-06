import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { BrandFooter } from "@/components/layout/brand-footer";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eternum Tabletop",
  description: "A dark fantasy campaign manager and Eternum rules engine for D&D-compatible play."
};

const nav = [
  { href: "/", label: "Eternum" },
  { href: "/rules", label: "Rules" },
  { href: "/library", label: "Library" },
  { href: "/maps", label: "Maps" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Vision" },
  { href: "/dashboard", label: "Dashboard" }
];

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
          globalRoles: true
        }
      })
    : null;
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
          <header className="sticky top-0 z-40 border-b border-aureate/10 bg-void/90 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-aureate md:text-left md:tracking-[0.24em]">
                Eternum Tabletop
              </Link>
              <div className="grid grid-cols-3 gap-2 text-center text-sm text-zinc-300 sm:flex sm:flex-wrap sm:items-center sm:justify-center md:justify-end">
                {nav.slice(1).map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-2 py-2 hover:bg-white/5 hover:text-white sm:px-3">
                    {item.label}
                  </Link>
                ))}
                {account ? (
                  <div className="col-span-3 flex justify-center sm:col-span-1">
                    <AccountMenu
                      user={{ name: account.name, username: account.username, image: account.image }}
                      notificationCount={notificationCount}
                      showAdminTools={account.globalRoles.includes("DM")}
                    />
                  </div>
                ) : (
                  <>
                    <Link href="/login" className="rounded-md border border-aureate/25 px-2 py-2 text-aureate hover:bg-aureate/10 sm:px-3">
                      Sign in
                    </Link>
                    <Link href="/register" className="rounded-md bg-aureate px-2 py-2 font-semibold text-void hover:bg-aureate/90 sm:px-3">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </header>
          <div className="flex-1">{children}</div>
          <BrandFooter />
        </div>
      </body>
    </html>
  );
}
