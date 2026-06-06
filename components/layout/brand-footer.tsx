import Link from "next/link";

export function BrandFooter() {
  return (
    <footer className="border-t border-white/10 bg-void/80 px-5 py-6 text-center text-xs text-zinc-500">
      Powered by{" "}
      <Link className="text-zinc-300 transition hover:text-aureate" href="https://obsidian-systems.tech">
        Obsidian Systems LLC
      </Link>
    </footer>
  );
}
