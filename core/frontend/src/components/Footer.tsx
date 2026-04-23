interface Props {
  index: number;
  total: number;
}

export function Footer({ index, total }: Props) {
  const label = total === 0 ? "0/0" : `${index + 1}/${total}`;
  return (
    <div className="flex h-8 items-center justify-between border-t border-[var(--color-border)] px-4 text-[11px] text-[var(--color-muted)]">
      <div className="flex items-center gap-3">
        <Hint k="⏎" label="Paste" />
        <Hint k="↑↓" label="Navigate" />
        <Hint k="Esc" label="Close" />
      </div>
      <div>{label}</div>
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-[var(--font-mono)] text-[10px]">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
