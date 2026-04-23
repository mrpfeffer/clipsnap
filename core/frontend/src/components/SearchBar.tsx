import { Search } from "lucide-react";
import { forwardRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange }, ref) => {
    return (
      <div className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] px-4">
        <Search size={18} className="text-[var(--color-muted)]" />
        <input
          ref={ref}
          type="text"
          autoFocus
          spellCheck={false}
          placeholder="Search…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--color-muted)]"
        />
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";
