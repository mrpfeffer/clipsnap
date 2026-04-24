import { useCallback, useEffect, useState } from "react";
import { listSnippets } from "../lib/ipc";
import type { Snippet } from "../lib/types";

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  const refresh = useCallback(async () => {
    const rows = await listSnippets();
    setSnippets(rows);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snippets, refresh };
}
