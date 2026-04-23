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
