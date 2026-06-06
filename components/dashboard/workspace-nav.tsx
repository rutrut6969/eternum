import Link from "next/link";

const workspaceLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/characters", label: "Characters" },
  { href: "/dashboard/homebrew", label: "Homebrew" },
  { href: "/dashboard/homebrew/spells/new", label: "Spells" },
  { href: "/dashboard/homebrew/items/new", label: "Items" },
  { href: "/dashboard/maps", label: "Maps" },
  { href: "/dashboard#dice", label: "Dice" },
  { href: "/library", label: "Library" },
  { href: "/dashboard/characters#approvals", label: "Approvals" },
  { href: "/dashboard/account", label: "Account" }
];

export function WorkspaceNav() {
  return (
    <>
      <nav className="border-b border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-5">
          {workspaceLinks.map((item) => (
            <Link
              key={item.href}
              className="shrink-0 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300 transition hover:border-mana/25 hover:bg-white/5 hover:text-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-void/95 px-2 py-2 text-center text-xs text-zinc-300 backdrop-blur md:hidden">
        {workspaceLinks.slice(0, 5).map((item) => (
          <Link key={item.href} className="rounded-md px-1 py-2 hover:bg-white/5 hover:text-white" href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
