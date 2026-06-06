"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountMenu } from "@/components/layout/account-menu";

type HeaderAccount = {
  name: string | null;
  username: string;
  image: string | null;
  isFounder: boolean;
};

type SiteHeaderProps = {
  account: HeaderAccount | null;
  notificationCount: number;
  showDmTools: boolean;
};

const publicLinks = [
  { href: "/rules", label: "Rules" },
  { href: "/library", label: "Library" },
  { href: "/maps", label: "Maps" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Vision" }
];

const appLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/characters", label: "Characters" },
  { href: "/dashboard/homebrew", label: "Homebrew" },
  { href: "/dashboard/homebrew/spells/new", label: "Spells" },
  { href: "/dashboard/homebrew/items/new", label: "Items" },
  { href: "/dashboard/maps", label: "Maps" },
  { href: "/dashboard#dice", label: "Dice" },
  { href: "/library", label: "Library" },
  { href: "/dashboard/account", label: "Account" },
  { href: "/pricing", label: "Pricing" }
];

const dmLinks = [
  { href: "/dashboard", label: "DM Dashboard" },
  { href: "/dashboard/characters#approvals", label: "Approvals" },
  { href: "/dashboard/campaigns", label: "Sessions" },
  { href: "/dashboard/campaigns", label: "Member Management" },
  { href: "/dashboard#dice", label: "Hidden Rolls" },
  { href: "/dashboard/campaigns", label: "Campaign Settings" }
];

export function SiteHeader({ account, notificationCount, showDmTools }: SiteHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logoHref = account ? "/dashboard" : "/";
  const drawerLinks = account ? appLinks : publicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-void/92 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 md:h-auto md:py-3">
        <button
          aria-label="Open navigation menu"
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-black/25 text-zinc-200 md:hidden"
          type="button"
          onClick={() => setDrawerOpen(true)}
        >
          <span className="grid gap-1">
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
            <span className="block h-0.5 w-4 bg-current" />
          </span>
        </button>

        <Link href={logoHref} className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-aureate md:text-left md:tracking-[0.24em]">
          Eternum Tabletop
        </Link>

        <div className="hidden items-center justify-end gap-2 text-sm text-zinc-300 md:flex">
          {(account ? appLinks.slice(0, 7) : publicLinks).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 hover:bg-white/5 hover:text-white">
              {item.label}
            </Link>
          ))}
          {account ? (
            <AccountMenu
              user={account}
              notificationCount={notificationCount}
              showAdminTools={showDmTools}
            />
          ) : (
            <>
              <Link href="/login" className="rounded-md border border-aureate/25 px-3 py-2 text-aureate hover:bg-aureate/10">Sign in</Link>
              <Link href="/register" className="rounded-md bg-aureate px-3 py-2 font-semibold text-void hover:bg-aureate/90">Create account</Link>
            </>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-end md:hidden">
          {account ? (
            <AccountMenu user={account} notificationCount={notificationCount} showAdminTools={showDmTools} compact />
          ) : (
            <Link href="/login" className="rounded-md border border-aureate/25 px-2 py-2 text-xs text-aureate">Sign in</Link>
          )}
        </div>
      </nav>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close navigation menu" type="button" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[82vw] max-w-80 flex-col border-r border-white/10 bg-[#0f0e15] p-4 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <Link href={logoHref} className="text-sm font-semibold uppercase tracking-[0.16em] text-aureate" onClick={() => setDrawerOpen(false)}>
                Eternum
              </Link>
              <button className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300" type="button" onClick={() => setDrawerOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-1">
              {drawerLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5" onClick={() => setDrawerOpen(false)}>
                  {item.label}
                </Link>
              ))}
              {!account ? (
                <>
                  <Link href="/login" className="rounded-md px-3 py-3 text-sm font-medium text-aureate hover:bg-aureate/10" onClick={() => setDrawerOpen(false)}>Sign In</Link>
                  <Link href="/register" className="rounded-md bg-aureate px-3 py-3 text-sm font-semibold text-void" onClick={() => setDrawerOpen(false)}>Create Account</Link>
                </>
              ) : null}
            </div>

            {account && showDmTools ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="px-3 text-xs uppercase tracking-[0.16em] text-zinc-500">DM tools</p>
                <div className="mt-2 grid gap-1">
                  {dmLinks.map((item) => (
                    <Link key={item.label} href={item.href} className="rounded-md px-3 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setDrawerOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </header>
  );
}
