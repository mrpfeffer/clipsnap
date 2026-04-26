import { useCallback, useEffect, useState } from "react";
import { listNoteCategories, listNotes } from "../lib/ipc";
import type { Note } from "../lib/types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [rows, cats] = await Promise.all([listNotes(), listNoteCategories()]);
    setNotes(rows);
    setCategories(cats);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { notes, categories, refresh };
}
