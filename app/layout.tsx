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
                <Link href="/login" className="rounded-md border border-aureate/30 px-2 py-2 text-aureate hover:bg-aureate/10 sm:px-3">
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
