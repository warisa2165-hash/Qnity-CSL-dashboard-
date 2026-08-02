"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";

import type { NavItem } from "@/lib/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMPTY_HITS: SearchHit[] = [];

interface SearchHit {
  label: string;
  href: string;
  context: string;
}

/**
 * Portal-wide search. Pages come from the user's own navigation list, so the
 * search box can never surface a page the user is not allowed to open.
 * Record results are fetched from the permission-aware /api/search route.
 */
export function GlobalSearch({
  open,
  onOpenChange,
  nav,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nav: NavItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [records, setRecords] = React.useState<SearchHit[]>([]);
  const [cursor, setCursor] = React.useState(0);

  const pageHits: SearchHit[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return nav
      .filter((i) => !q || i.label.toLowerCase().includes(q))
      .slice(0, 6)
      .map((i) => ({ label: i.label, href: i.href, context: i.group }));
  }, [nav, query]);

  React.useEffect(() => {
    const q = query.trim();
    // Nothing to fetch for a short query. The results are *derived* as empty
    // below rather than cleared here, so no state is set inside the effect.
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) setRecords((await res.json()).results ?? []);
      } catch {
        /* aborted or offline — page results still work */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // A short query shows no record results even if an earlier, longer query
  // left some in state; typing back past two characters refetches.
  const visibleRecords = query.trim().length < 2 ? EMPTY_HITS : records;
  const all = [...pageHits, ...visibleRecords];

  // Reset the keyboard cursor when the query changes. Adjusted during render
  // rather than in an effect, so the highlighted row never lands on a stale
  // index for a frame.
  const [cursorQuery, setCursorQuery] = React.useState(query);
  if (query !== cursorQuery) {
    setCursorQuery(query);
    setCursor(0);
  }

  function go(hit: SearchHit | undefined) {
    if (!hit) return;
    onOpenChange(false);
    setQuery("");
    router.push(hit.href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-3 p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>Search the project portal</DialogTitle>
          <DialogDescription>
            Search pages, milestones, risks, actions, documents and equipment.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, all.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(all[cursor]);
              }
            }}
            placeholder="Search pages, milestones, risks, actions, documents…"
            className="h-11 pl-9 text-base"
          />
        </div>

        <div className="max-h-[22rem] overflow-y-auto scrollbar-thin">
          {all.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {query.length < 2
                ? "Type at least two characters to search project records."
                : "No matches found."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {all.map((hit, i) => (
                <li key={`${hit.href}-${hit.label}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(hit)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      i === cursor ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{hit.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.context}
                      </span>
                    </span>
                    {i === cursor && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
