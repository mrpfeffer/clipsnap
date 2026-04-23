import { useMemo } from "react";
import type { ClipEntry } from "../lib/types";
import { formatBytes } from "../lib/format";

interface Props {
  entry: ClipEntry | null;
}

export function PreviewPanel({ entry }: Props) {
  const parsedFiles = useMemo<string[] | null>(() => {
    if (!entry || entry.content_type !== "files") return null;
    try {
      return JSON.parse(entry.content_data) as string[];
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

  const meta = (
    <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
      <span>{entry.content_type}</span>
      <span>·</span>
      <span>{formatBytes(entry.byte_size)}</span>
    </div>
  );

  if (entry.content_type === "image") {
    const src = `data:image/png;base64,${entry.content_data}`;
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

  if (entry.content_type === "files" && parsedFiles) {
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

  if (entry.content_type === "html") {
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <iframe
          sandbox=""
          srcDoc={entry.content_data}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-white"
          title="html preview"
        />
      </div>
    );
  }

  if (entry.content_type === "rtf") {
    return (
      <div className="flex h-full flex-col p-4">
        {meta}
        <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-[var(--font-mono)] text-[12px] leading-5">
          {entry.content_text}
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
        {entry.content_data}
      </pre>
    </div>
  );
}
