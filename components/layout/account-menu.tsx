"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

type AccountMenuProps = {
  user: {
    name: string | null;
    username: string;
    image: string | null;
  };
  notificationCount: number;
  showAdminTools?: boolean;
};

const menuItems = [
  { href: "/dashboard/account", label: "Account" },
  { href: "/dashboard/characters", label: "Characters" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/homebrew", label: "Homebrew" },
  { href: "/dashboard/maps", label: "Maps" },
  { href: "/dashboard/account", label: "Settings" },
  { href: "/pricing", label: "Subscription" }
];

function initials(name: string | null, username: string) {
  const source = name || username;
  const parts = source.split(/\s+|_/).filter(Boolean);
  return (parts[0]?.[0] ?? "E").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function AccountMenu({ user, notificationCount, showAdminTools = false }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const label = user.name || user.username;

  return (
    <div className="relative flex items-center justify-center gap-2">
      <Link
        aria-label="Open account"
        className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/15 bg-black/35 text-sm font-bold text-aureate transition hover:border-aureate/40"
        href="/dashboard/account"
      >
        {user.image ? <img alt="" className="h-full w-full object-cover" src={user.image} /> : initials(user.name, user.username)}
        {notificationCount > 0 ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full border border-void bg-crimson" /> : null}
      </Link>
      <button
        className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/5"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="block max-w-28 truncate font-semibold text-white">{label}</span>
        <span className="block max-w-28 truncate text-xs text-zinc-500">@{user.username}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-white/10 bg-[#111018] p-2 text-sm shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 px-3 py-3">
            <p className="font-semibold text-white">{label}</p>
            <p className="text-xs text-zinc-500">@{user.username}</p>
            {notificationCount > 0 ? <p className="mt-2 text-xs text-crimson">{notificationCount} item{notificationCount === 1 ? "" : "s"} need attention</p> : null}
          </div>
          <div className="py-2">
            {menuItems.map((item) => (
              <Link key={item.label} className="block rounded-md px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white" href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            {showAdminTools ? (
              <Link className="block rounded-md px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white" href="/dashboard?admin=tools" onClick={() => setOpen(false)}>
                Admin tools
              </Link>
            ) : null}
          </div>
          <button
            className="w-full rounded-md border-t border-white/10 px-3 py-2 text-left text-crimson hover:bg-crimson/10"
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
