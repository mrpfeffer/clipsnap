import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Footer } from "./components/Footer";
import { HistoryList } from "./components/HistoryList";
import { PreviewPanel } from "./components/PreviewPanel";
import { SearchBar } from "./components/SearchBar";
import { useClipboardHistory } from "./hooks/useClipboardHistory";
import { useFuzzySearch } from "./hooks/useFuzzySearch";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { hidePopup, pasteEntry } from "./lib/ipc";

function App() {
  const { entries } = useClipboardHistory();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useFuzzySearch(entries, query);

  useEffect(() => {
    setSelected(0);
  }, [query, entries.length]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen("window-shown", () => {
        setQuery("");
        setSelected(0);
        requestAnimationFrame(() => {
          searchRef.current?.focus();
          searchRef.current?.select();
        });
      });
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  const activate = async (i: number) => {
    const target = filtered[i];
    if (!target) return;
    try {
      await pasteEntry(target.id);
    } catch (e) {
      console.error("paste failed", e);
    }
  };

  useKeyboardNav({
    length: filtered.length,
    selected,
    setSelected,
    onEnter: () => void activate(selected),
    onEscape: () => {
      void hidePopup();
    },
  });

  const current = filtered[selected] ?? null;

  return (
    <div className="flex h-screen w-screen p-2">
      <div className="app-shell fade-in flex h-full w-full flex-col">
        <SearchBar ref={searchRef} value={query} onChange={setQuery} />
        <div className="flex min-h-0 flex-1">
          <div className="w-2/5 border-r border-[var(--color-border)]">
            <HistoryList
              entries={filtered}
              selectedIndex={selected}
              onSelect={setSelected}
              onActivate={activate}
            />
          </div>
          <div className="w-3/5 min-w-0">
            <PreviewPanel entry={current} />
          </div>
        </div>
        <Footer index={selected} total={filtered.length} />
      </div>
    </div>
  );
}

export default App;
