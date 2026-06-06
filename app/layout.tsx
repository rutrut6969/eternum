import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eternum Tabletop",
  description: "A dark fantasy campaign manager and Eternum rules engine for D&D-compatible play."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="arcane-grid flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
