import { Calculator, ChevronRight } from "lucide-react";
import { forwardRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** When true, swap the input glyph for a calculator icon (calc-mode hint). */
  calcMode?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, calcMode }, ref) => {
    return (
      // pr-[260px] reserves room for the absolute tab strip on the right
      // (History · Snippets · Notes · Settings) so the placeholder + value
      // never get hidden behind the buttons. Keep this in sync with the
      // tab-strip width if more tabs get added.
      <div className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] pl-4 pr-[260px]">
        {calcMode ? (
          <Calculator size={18} className="text-[var(--color-accent)]" />
        ) : (
          <ChevronRight size={18} className="text-[var(--color-muted)]" />
        )}
        <input
          ref={ref}
          type="text"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Search or calculate…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--color-muted)]"
        />
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";
