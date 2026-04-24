import { memo } from "react";
import { FileCode2, FileText, Files, Image, Type, Zap } from "lucide-react";
import type { ListEntry } from "../lib/types";
import { relativeTime, truncateOneLine } from "../lib/format";

interface Props {
  entry: ListEntry;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  style?: React.CSSProperties;
}

function TypeIcon({ entry }: { entry: ListEntry }) {
  const cls = "shrink-0";
  const size = 14;
  if (entry.kind === "snippet") return <Zap size={size} className={cls} />;
  switch (entry.data.content_type) {
    case "text":  return <Type size={size} className={cls} />;
    case "image": return <Image size={size} className={cls} />;
    case "files": return <Files size={size} className={cls} />;
    case "html":  return <FileCode2 size={size} className={cls} />;
    case "rtf":   return <FileText size={size} className={cls} />;
  }
}

export const HistoryItem = memo(function HistoryItem({
  entry,
  selected,
  onClick,
  onDoubleClick,
  style,
}: Props) {
  const isSnippet = entry.kind === "snippet";

  const label = isSnippet
    ? `${entry.data.abbreviation}  ${entry.data.title || entry.data.body.split("\n")[0]}`
    : truncateOneLine(entry.data.content_text || "(empty)", 80);

  const right = isSnippet ? (
    <span
      className={
        "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        (selected
          ? "bg-white/20 text-white/80"
          : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]")
      }
    >
      snippet
    </span>
  ) : (
    <span
      className={
        "shrink-0 text-[11px] " +
        (selected ? "text-white/70" : "text-[var(--color-muted)]")
      }
    >
      {relativeTime(entry.data.last_used_at)}
    </span>
  );

  return (
    <div
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={
        "flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] " +
        (selected
          ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
          : "hover:bg-[var(--color-surface)]")
      }
    >
      <span
        className={
          "shrink-0 " +
          (selected ? "text-white/80" : "text-[var(--color-muted)]")
        }
      >
        <TypeIcon entry={entry} />
      </span>
      <span className="flex-1 truncate">
        {isSnippet ? (
          <>
            <span className="font-[var(--font-mono)] font-semibold">
              {entry.data.abbreviation}
            </span>
            {(entry.data.title || entry.data.body.split("\n")[0]) && (
              <span className={selected ? "text-white/70" : "text-[var(--color-muted)]"}>
                {"  "}
                {truncateOneLine(entry.data.title || entry.data.body.split("\n")[0], 50)}
              </span>
            )}
          </>
        ) : (
          label
        )}
      </span>
      {right}
    </div>
  );
});
