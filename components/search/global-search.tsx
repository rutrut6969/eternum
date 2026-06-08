"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Result = {
  id: string;
  title: string;
  category: string;
  source: string;
  href: string;
  summary?: string;
};

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }).catch(() => null);
      setLoading(false);
      if (response?.ok) {
        const body = await response.json();
        setResults(body.results ?? []);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={compact ? "global-search-compact" : "global-search"}>Search Eternum</label>
      <input
        id={compact ? "global-search-compact" : "global-search"}
        className="w-full rounded-md border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-mana"
        placeholder="Search spells, species, items, maps, homebrew..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {(results.length > 0 || loading) ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-[#101018] p-2 shadow-2xl shadow-black/50">
          {loading ? <p className="p-3 text-sm text-zinc-400">Searching...</p> : null}
          {results.map((result) => (
            <Link key={`${result.source}-${result.id}`} className="block rounded-md p-3 hover:bg-white/5" href={result.href} onClick={() => setQuery("")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">{result.title}</span>
                <span className="rounded-full border border-mana/25 px-2 py-0.5 text-xs text-mana">{result.category}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{result.source}</p>
              {result.summary ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{result.summary.replace(/\s+/g, " ")}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
