import { memo } from "react";
import { FileCode2, FileText, Files, Image, Type } from "lucide-react";
import type { ClipEntry } from "../lib/types";
import { relativeTime, truncateOneLine } from "../lib/format";

interface Props {
  entry: ClipEntry;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  style?: React.CSSProperties;
}

function TypeIcon({ t }: { t: ClipEntry["content_type"] }) {
  const cls = "shrink-0";
  const size = 14;
  switch (t) {
    case "text":
      return <Type size={size} className={cls} />;
    case "image":
      return <Image size={size} className={cls} />;
    case "files":
      return <Files size={size} className={cls} />;
    case "html":
      return <FileCode2 size={size} className={cls} />;
    case "rtf":
      return <FileText size={size} className={cls} />;
  }
}

export const HistoryItem = memo(function HistoryItem({
  entry,
  selected,
  onClick,
  onDoubleClick,
  style,
}: Props) {
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
          (selected
            ? "text-white/80"
            : "text-[var(--color-muted)]")
        }
      >
        <TypeIcon t={entry.content_type} />
      </span>
      <span className="flex-1 truncate">
        {truncateOneLine(entry.content_text || "(empty)", 80)}
      </span>
      <span
        className={
          "shrink-0 text-[11px] " +
          (selected ? "text-white/70" : "text-[var(--color-muted)]")
        }
      >
        {relativeTime(entry.last_used_at)}
      </span>
    </div>
  );
});
