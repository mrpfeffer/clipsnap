import { useMemo } from "react";
import { Zap } from "lucide-react";
import type { ListEntry } from "../lib/types";
import { formatBytes } from "../lib/format";

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
