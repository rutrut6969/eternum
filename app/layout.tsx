import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eternum Tabletop",
  description: "A dark fantasy campaign manager and Eternum rules engine for D&D-compatible play."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh overflow-x-hidden font-sans antialiased">
        <div className="arcane-grid flex min-h-dvh min-w-0 flex-col overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
