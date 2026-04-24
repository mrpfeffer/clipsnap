import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { HistoryItem } from "./HistoryItem";
import type { ListEntry } from "../lib/types";

interface Props {
  entries: ListEntry[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  onActivate: (i: number) => void;
}

const ROW_HEIGHT = 36;

export function HistoryList({ entries, selectedIndex, onSelect, onActivate }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < entries.length) {
      virtualizer.scrollToIndex(selectedIndex, { align: "auto" });
    }
  }, [selectedIndex, virtualizer, entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--color-muted)]">
        No matches
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          const key = entry.kind === "snippet" ? `s-${entry.data.id}` : `c-${entry.data.id}`;
          return (
            <HistoryItem
              key={key}
              entry={entry}
              selected={virtualRow.index === selectedIndex}
              onClick={() => onSelect(virtualRow.index)}
              onDoubleClick={() => onActivate(virtualRow.index)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
