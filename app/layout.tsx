import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eternum Tabletop",
  description: "A dark fantasy campaign manager and Eternum rules engine for D&D-compatible play."
};

const nav = [
  { href: "/", label: "Eternum" },
  { href: "/rules", label: "Rules" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "Vision" },
  { href: "/dashboard", label: "Dashboard" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="arcane-grid min-h-screen">
          <header className="sticky top-0 z-40 border-b border-aureate/10 bg-void/85 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-aureate">
                Eternum Tabletop
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-zinc-300">
                {nav.slice(1).map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 hover:bg-white/5 hover:text-white">
                    {item.label}
                  </Link>
                ))}
                <Link href="/login" className="rounded-md border border-aureate/30 px-3 py-2 text-aureate hover:bg-aureate/10">
                  Sign in
                </Link>
              </div>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
