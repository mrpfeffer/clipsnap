export type ContentType = "text" | "rtf" | "html" | "image" | "files";

export interface ClipEntry {
  id: number;
  content_type: ContentType;
  content_text: string;
  /** For text/rtf/html: raw payload. image: base64 PNG. files: JSON array. */
  content_data: string;
  hash: string;
  byte_size: number;
  created_at: number;
  last_used_at: number;
}

export interface Snippet {
  id: number;
  abbreviation: string;
  title: string;
  body: string;
  created_at: number;
  updated_at: number;
}

export interface CalcEntry {
  /** The raw expression typed by the user (trimmed, may include `=` prefix). */
  expression: string;
  /** Numeric result. */
  value: number;
  /** Display-formatted result that gets pasted on activation. */
  display: string;
}

export interface Note {
  id: number;
  content_type: ContentType;
  /** Plain-text preview (always populated for search). */
  content_text: string;
  /** Raw payload — same convention as ClipEntry.content_data. */
  content_data: string;
  title: string;
  category: string;
  byte_size: number;
  created_at: number;
  updated_at: number;
}

export interface BackupImportResult {
  history_imported: number;
  snippets_imported: number;
  notes_imported: number;
  errors: string[];
}

export type ListEntry =
  | { kind: "clip"; data: ClipEntry }
  | { kind: "snippet"; data: Snippet }
  | { kind: "calc"; data: CalcEntry };
