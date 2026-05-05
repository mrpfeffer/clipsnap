import { useMemo } from "react";
import { Calculator, Copy, Palette, Zap } from "lucide-react";
import type { ListEntry } from "../lib/types";
import { formatBytes } from "../lib/format";
import { readableForeground } from "../lib/colors";

interface Props {
  entry: ListEntry | null;
}

export function PreviewPanel({ entry }: Props) {
  const parsedFiles = useMemo<string[] | null>(() => {
    if (!entry || entry.kind !== "clip" || entry.data.content_type !== "files") return null;
    try {
      return JSON.parse(entry.data.content_data) as string[];
    } catch {
      return null;
    }
  }, [entry]);

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--color-muted)]">
        Select an entry
      </div>
    );
  }

  // ── Color preview ──────────────────────────────────────────────────────────
  if (entry.kind === "color") {
    const c = entry.data;
    const fg = readableForeground(c.r, c.g, c.b);
    const copy = (text: string) => {
      void navigator.clipboard.writeText(text).catch(() => {});
    };
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <Palette size={12} className="text-[var(--color-accent)]" />
          <span>color</span>
          <span>·</span>
          <span>press Enter to paste hex</span>
        </div>
        <div
          className="flex h-32 items-center justify-center rounded-lg border border-[var(--color-border)] font-[var(--font-mono)] text-[24px] font-semibold tracking-wider"
          style={{ backgroundColor: c.hex, color: fg }}
        >
          {c.hex}
        </div>
        <div className="mt-3 grid grid-cols-[80px_1fr_auto] items-center gap-x-3 gap-y-1.5 text-[12px]">
          <span className="text-[var(--color-muted)]">Hex</span>
          <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-[var(--font-mono)]">
            {c.hex}
          </code>
          <CopyButton onClick={() => copy(c.hex)} />

          <span className="text-[var(--color-muted)]">RGB</span>
          <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-[var(--font-mono)]">
            {c.rgbString}
          </code>
          <CopyButton onClick={() => copy(c.rgbString)} />

          <span className="text-[var(--color-muted)]">HSL</span>
          <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-[var(--font-mono)]">
            {c.hslString}
          </code>
          <CopyButton onClick={() => copy(c.hslString)} />
        </div>
      </div>
    );
  }

  // ── Calc preview ───────────────────────────────────────────────────────────
  if (entry.kind === "calc") {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <Calculator size={12} className="text-[var(--color-accent)]" />
          <span>calculator</span>
          <span>·</span>
          <span>press Enter to paste result</span>
        </div>
        <div className="flex flex-1 flex-col items-stretch justify-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="text-center font-[var(--font-mono)] text-[14px] text-[var(--color-muted)]">
            {entry.data.expression}
          </div>
          <div className="text-center font-[var(--font-mono)] text-[28px] font-semibold leading-tight">
            = {entry.data.display}
          </div>
        </div>
      </div>
    );
  }

  // ── Snippet preview ────────────────────────────────────────────────────────
  if (entry.kind === "snippet") {
    const { abbreviation, title, body } = entry.data;
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <Zap size={12} className="text-[var(--color-accent)]" />
          <span>snippet</span>
          <span>·</span>
          <span>{formatBytes(body.length)}</span>
        </div>
        <div className="mb-3 flex items-baseline gap-3">
          <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-[var(--font-mono)] text-[13px] font-semibold">
            {abbreviation}
          </kbd>
          {title && (
            <span className="text-[13px] text-[var(--color-muted)]">{title}</span>
          )}
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-[var(--font-mono)] text-[12px] leading-5">
          {body}
        </pre>
      </div>
    );
  }

  // ── Clip preview ───────────────────────────────────────────────────────────
  const clip = entry.data;

  const meta = (
    <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
      <span>{clip.content_type}</span>
      <span>·</span>
      <span>{formatBytes(clip.byte_size)}</span>
    </div>
  );

  if (clip.content_type === "image") {
    const src = `data:image/png;base64,${clip.content_data}`;
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <img
            src={src}
            alt="clipboard image"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    );
  }

  if (clip.content_type === "files" && parsedFiles) {
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <div className="flex-1 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-[var(--font-mono)] text-[12px]">
          {parsedFiles.map((p, i) => (
            <div key={i} className="truncate py-0.5">
              {p}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (clip.content_type === "html") {
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <iframe
          sandbox=""
          srcDoc={clip.content_data}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-white"
          title="html preview"
        />
      </div>
    );
  }

  if (clip.content_type === "rtf") {
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-[var(--font-mono)] text-[12px] leading-5">
          {clip.content_text}
        </pre>
        <div className="mt-2 text-[11px] text-[var(--color-muted)]">
          RTF formatting will be preserved on paste.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {meta}
      <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-[var(--font-mono)] text-[12px] leading-5">
        {clip.content_data}
      </pre>
    </div>
  );
}

function CopyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Copy"
      className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
    >
      <Copy size={11} />
    </button>
  );
}
