import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Footer } from "./components/Footer";
import { HistoryList } from "./components/HistoryList";
import { PreviewPanel } from "./components/PreviewPanel";
import { SearchBar } from "./components/SearchBar";
import { SnippetsPanel } from "./components/SnippetsPanel";
import { useClipboardHistory } from "./hooks/useClipboardHistory";
import { useFuzzySearch } from "./hooks/useFuzzySearch";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useSnippets } from "./hooks/useSnippets";
import { findSnippets, hidePopup, pasteEntry, pasteSnippet } from "./lib/ipc";
import type { ListEntry, Snippet } from "./lib/types";

type Tab = "history" | "snippets";

function App() {
  const { entries } = useClipboardHistory();
  const { snippets, refresh: refreshSnippets } = useSnippets();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [matchingSnippets, setMatchingSnippets] = useState<Snippet[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredClips = useFuzzySearch(entries, query);

  // Combine: snippets first (only when searching), then history clips.
  const combined: ListEntry[] = [
    ...matchingSnippets.map((s): ListEntry => ({ kind: "snippet", data: s })),
    ...filteredClips.map((c): ListEntry => ({ kind: "clip", data: c })),
  ];

  // Find matching snippets whenever query changes.
  useEffect(() => {
    if (!query.trim()) {
      setMatchingSnippets([]);
      return;
    }
    findSnippets(query)
      .then(setMatchingSnippets)
      .catch(() => setMatchingSnippets([]));
  }, [query]);

  useEffect(() => {
    setSelected(0);
  }, [query, entries.length]);

  // Handle window-shown (hotkey): reset to history tab.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen("window-shown", () => {
        setActiveTab("history");
        setQuery("");
        setSelected(0);
        requestAnimationFrame(() => {
          searchRef.current?.focus();
          searchRef.current?.select();
        });
      });
    })();
    return () => unlisten?.();
  }, []);

  // Handle tray "Manage Snippets": switch to snippets tab.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen("open-snippets-tab", () => {
        setActiveTab("snippets");
        void refreshSnippets();
      });
    })();
    return () => unlisten?.();
  }, [refreshSnippets]);

  const activate = async (i: number) => {
    const target = combined[i];
    if (!target) return;
    try {
      if (target.kind === "snippet") {
        await pasteSnippet(target.data.id);
      } else {
        await pasteEntry(target.data.id);
      }
    } catch (e) {
      console.error("paste failed", e);
    }
  };

  useKeyboardNav({
    length: combined.length,
    selected,
    setSelected,
    onEnter: () => void activate(selected),
    onEscape: () => {
      void hidePopup();
    },
  });

  const current = combined[selected] ?? null;

  return (
    <div className="flex h-screen w-screen p-2">
      <div className="app-shell fade-in flex h-full w-full flex-col">

        {/* Tab bar + search */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-1.5">
          {activeTab === "history" ? (
            <SearchBar ref={searchRef} value={query} onChange={setQuery} />
          ) : (
            <span className="flex-1 text-[13px] font-semibold">Snippets</span>
          )}
          <div className="flex shrink-0 gap-1">
            <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
              History
            </TabButton>
            <TabButton active={activeTab === "snippets"} onClick={() => {
              setActiveTab("snippets");
              void refreshSnippets();
            }}>
              Snippets
            </TabButton>
          </div>
        </div>

        {/* Content */}
        {activeTab === "history" ? (
          <div className="flex min-h-0 flex-1">
            <div className="w-2/5 border-r border-[var(--color-border)]">
              <HistoryList
                entries={combined}
                selectedIndex={selected}
                onSelect={setSelected}
                onActivate={activate}
              />
            </div>
            <div className="w-3/5 min-w-0">
              <PreviewPanel entry={current} />
            </div>
          </div>
        ) : (
          <SnippetsPanel snippets={snippets} onRefresh={refreshSnippets} />
        )}

        <Footer index={selected} total={activeTab === "history" ? combined.length : snippets.length} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded px-2.5 py-1 text-[11px] font-medium transition-colors " +
        (active
          ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]")
      }
    >
      {children}
    </button>
  );
}

export default App;
