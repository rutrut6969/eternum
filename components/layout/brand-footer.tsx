import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing" },
  { href: "/donate", label: "Donate" },
  { href: "/maps", label: "Maps" }
];

const futureLinks = [
  { href: "/about#roadmap", label: "Roadmap" },
  { href: "/about#community", label: "Community" },
  { href: "mailto:contact@obsidian-systems.tech", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/about#discord", label: "Discord" }
];

export function BrandFooter() {
  return (
    <footer className="border-t border-white/10 bg-void/90 px-5 py-10 text-sm text-zinc-400">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-aureate">Eternum Tabletop</p>
          <p className="mt-3 max-w-md leading-6">AI-assisted campaign management, homebrew creation, VTT foundations, and classless progression for long-running fantasy tables.</p>
          <p className="mt-5 text-xs text-zinc-500">
            Powered by{" "}
            <Link className="text-zinc-300 transition hover:text-aureate" href="https://obsidian-systems.tech">
              Obsidian Systems LLC
            </Link>
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Explore</p>
          <div className="mt-3 grid gap-2">
            {footerLinks.map((link) => <Link key={link.href} className="hover:text-white" href={link.href}>{link.label}</Link>)}
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Project</p>
          <div className="mt-3 grid gap-2">
            {futureLinks.map((link) => <Link key={link.href} className="hover:text-white" href={link.href}>{link.label}</Link>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">Privacy Policy and Terms pages are launch-prep placeholders pending final review.</p>
        </div>
      </div>
    </footer>
  );
}
