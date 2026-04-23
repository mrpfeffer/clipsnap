import { useCallback, useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getHistory } from "../lib/ipc";
import type { ClipEntry } from "../lib/types";

export function useClipboardHistory() {
  const [entries, setEntries] = useState<ClipEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await getHistory(1000, 0);
    setEntries(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    let unlisten: UnlistenFn | undefined;
    let unshow: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen("clipboard-changed", () => {
        void refresh();
      });
      unshow = await listen("window-shown", () => {
        void refresh();
      });
    })();
    return () => {
      unlisten?.();
      unshow?.();
    };
  }, [refresh]);

  return { entries, loading, refresh };
}
