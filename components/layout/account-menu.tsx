"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type AccountMenuProps = {
  user: {
    name: string | null;
    username: string;
    image: string | null;
    isFounder?: boolean;
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
  { href: "/dashboard/assistant", label: "Assistant" },
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
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = user.name || user.username;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative flex items-center justify-center" ref={menuRef}>
      <button
        aria-label="Open account menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black/35 text-sm font-bold text-aureate transition hover:border-aureate/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aureate"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {user.image ? <img alt="" className="h-full w-full object-cover" src={user.image} /> : initials(user.name, user.username)}
        {notificationCount > 0 ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full border border-void bg-crimson" /> : null}
      </button>
      {open ? (
        <div
          aria-label="Account menu"
          className="absolute right-0 top-12 z-[70] max-h-[calc(100dvh-5rem)] w-[min(calc(100vw-2rem),18rem)] overflow-y-auto rounded-lg border border-white/10 bg-[#111018] p-2 text-sm shadow-2xl shadow-black/50"
          id={menuId}
          role="menu"
        >
          <div className="border-b border-white/10 px-3 py-3">
            <p className="font-semibold text-white">{label}</p>
            <p className="text-xs text-zinc-500">@{user.username}</p>
            {user.isFounder ? <p className="mt-2 inline-flex rounded-full border border-aureate/25 bg-aureate/10 px-2 py-1 text-xs text-aureate">Founder / Max Tier</p> : null}
            {notificationCount > 0 ? <p className="mt-2 text-xs text-crimson">{notificationCount} item{notificationCount === 1 ? "" : "s"} need attention</p> : null}
          </div>
          <div className="py-2">
            {menuItems.map((item) => (
              <Link key={item.label} className="block rounded-md px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-aureate" href={item.href} onClick={() => setOpen(false)} role="menuitem">
                {item.label}
              </Link>
            ))}
            {showAdminTools ? (
              <Link className="block rounded-md px-3 py-2 text-zinc-300 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-aureate" href="/dashboard?admin=tools" onClick={() => setOpen(false)} role="menuitem">
                Admin tools
              </Link>
            ) : null}
          </div>
          <button
            className="w-full rounded-md border-t border-white/10 px-3 py-2 text-left text-crimson hover:bg-crimson/10"
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
