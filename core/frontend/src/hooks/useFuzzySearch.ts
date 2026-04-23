import Fuse from "fuse.js";
import { useMemo } from "react";
import type { ClipEntry } from "../lib/types";

const OPTS: ConstructorParameters<typeof Fuse<ClipEntry>>[1] = {
  keys: ["content_text"],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

export function useFuzzySearch(entries: ClipEntry[], query: string): ClipEntry[] {
  const fuse = useMemo(() => new Fuse(entries, OPTS), [entries]);
  return useMemo(() => {
    const q = query.trim();
    if (!q) return entries;
    return fuse.search(q).map((r) => r.item);
  }, [entries, fuse, query]);
}
