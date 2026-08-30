"use client";

import { useState } from "react";
import { FileText, Loader2, Search, X } from "lucide-react";

import type { SearchResult } from "@/lib/types";
import { useContentSearch } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Content-search panel: searches across drawing text content (not just names).
 * Shown in place of the file list while a content query is active.
 */
export function SearchPanel({ onClose }: { onClose: () => void }) {
  const contentSearch = useContentSearch();
  const { setCurrentFile, setSidebarOpen } = useEditorStore();
  const [query, setQuery] = useState("");

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length >= 2) {
      void contentSearch.mutate(value.trim());
    }
  }

  function openResult(result: SearchResult) {
    setCurrentFile(result.fileId, result.name);
    setSidebarOpen(false);
  }

  const results = contentSearch.data ?? [];
  const showResults = query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search text in drawings…"
          className="h-8 pl-7 pr-7 text-xs"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
          aria-label="Close search"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {contentSearch.isPending && (
        <div className="flex items-center gap-2 px-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Searching across drawings…
        </div>
      )}

      {showResults && !contentSearch.isPending && results.length === 0 && (
        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
          No drawings contain <span className="font-medium text-foreground">"{query}"</span>.
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.fileId}
              type="button"
              onClick={() => openResult(r)}
              className="flex flex-col gap-1 rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="truncate font-medium">{r.name}</span>
              </span>
              {r.snippet && (
                <span className="line-clamp-2 text-xs text-muted-foreground">{r.snippet}</span>
              )}
              <span className="text-xs text-muted-foreground/70">
                {formatRelativeTime(r.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
