import { useCallback, useEffect } from "react";

interface Args {
  length: number;
  selected: number;
  setSelected: (i: number) => void;
  onEnter: () => void;
  onEscape: () => void;
}

export function useKeyboardNav({
  length,
  selected,
  setSelected,
  onEnter,
  onEscape,
}: Args) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (length === 0) return;
        setSelected(Math.min(selected + 1, length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (length === 0) return;
        setSelected(Math.max(selected - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (length > 0) onEnter();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      }
    },
    [length, selected, setSelected, onEnter, onEscape],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
