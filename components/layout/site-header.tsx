"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  variant: "public" | "app";
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

export function SiteHeader({ account, notificationCount, showDmTools, variant }: SiteHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const logoHref = variant === "app" || account ? "/dashboard" : "/";
  const drawerLinks = variant === "app" ? appLinks : [{ href: "/", label: "Home" }, ...publicLinks];
  const desktopLinks = variant === "app" ? appLinks.slice(0, 7) : publicLinks;

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  function isActive(href: string) {
    const path = href.split("#")[0];
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function drawerLinkClass(href: string) {
    return [
      "block rounded-md px-3 py-3 text-base font-medium transition",
      isActive(href)
        ? "border border-aureate/25 bg-aureate/10 text-aureate"
        : "border border-transparent text-zinc-100 hover:border-white/10 hover:bg-white/5 hover:text-white"
    ].join(" ");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08070c]/95 backdrop-blur">
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

        <Link href={logoHref} className="min-w-0 flex-1 truncate text-center text-xs font-semibold uppercase tracking-[0.14em] text-aureate sm:text-sm md:flex-none md:text-left md:tracking-[0.24em]">
          Eternum Tabletop
        </Link>

        <div className="hidden items-center justify-end gap-2 text-sm text-zinc-300 md:flex">
          {desktopLinks.map((item) => (
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
              <Link href="/login" className="whitespace-nowrap rounded-md border border-aureate/25 px-3 py-2 text-aureate hover:bg-aureate/10">Sign in</Link>
              <Link href="/register" className="whitespace-nowrap rounded-md bg-aureate px-3 py-2 font-semibold text-void hover:bg-aureate/90">Create account</Link>
            </>
          )}
        </div>

        <div className="flex h-10 w-10 items-center justify-end md:hidden">
          {account ? (
            <AccountMenu user={account} notificationCount={notificationCount} showAdminTools={showDmTools} compact />
          ) : (
            <Link href="/login" className="whitespace-nowrap rounded-md border border-aureate/25 px-2 py-2 text-xs text-aureate">Sign in</Link>
          )}
        </div>
      </nav>

      {drawerOpen ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden"
            aria-label="Close navigation menu"
            type="button"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(85vw,360px)] flex-col overflow-y-auto border-r border-aureate/20 bg-[#07070c] bg-[linear-gradient(180deg,rgba(20,18,30,0.98),rgba(7,7,12,1))] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl shadow-black/70 md:hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <Link href={logoHref} className="text-sm font-semibold uppercase tracking-[0.16em] text-aureate" onClick={() => setDrawerOpen(false)}>
                Eternum Tabletop
              </Link>
              <button className="rounded-md border border-white/15 bg-black/35 px-3 py-2 text-sm font-semibold text-zinc-100" type="button" onClick={() => setDrawerOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {drawerLinks.map((item) => (
                <Link key={item.href} href={item.href} className={drawerLinkClass(item.href)} onClick={() => setDrawerOpen(false)}>
                  {item.label}
                </Link>
              ))}
              {!account ? (
                <>
                  <Link href="/login" className={drawerLinkClass("/login")} onClick={() => setDrawerOpen(false)}>Sign In</Link>
                  <Link href="/register" className="whitespace-nowrap rounded-md bg-aureate px-3 py-3 text-base font-semibold text-void shadow-md shadow-aureate/10" onClick={() => setDrawerOpen(false)}>Create Account</Link>
                </>
              ) : null}
            </div>

            {account && showDmTools ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="px-3 text-xs uppercase tracking-[0.16em] text-zinc-500">DM tools</p>
                <div className="mt-3 grid gap-2">
                  {dmLinks.map((item) => (
                    <Link key={item.label} href={item.href} className={drawerLinkClass(item.href)} onClick={() => setDrawerOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {account ? (
              <div className="mt-auto border-t border-white/10 pt-4">
                <button
                  className="w-full rounded-md border border-crimson/20 bg-crimson/10 px-3 py-3 text-left text-base font-semibold text-crimson"
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </aside>
        </>
      ) : null}
    </header>
  );
}
