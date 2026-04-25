import { invoke } from "@tauri-apps/api/core";
import type { ClipEntry, Snippet } from "./types";

// ── Clipboard history ────────────────────────────────────────────────────────

export function getHistory(limit = 500, offset = 0): Promise<ClipEntry[]> {
  return invoke("get_history", { limit, offset });
}

export function searchHistory(query: string, limit = 500): Promise<ClipEntry[]> {
  return invoke("search_history", { query, limit });
}

export function pasteEntry(id: number): Promise<void> {
  return invoke("paste_entry", { id });
}

export function deleteEntry(id: number): Promise<void> {
  return invoke("delete_entry", { id });
}

export function clearHistory(): Promise<void> {
  return invoke("clear_history");
}

export function toggleCapture(paused: boolean): Promise<void> {
  return invoke("toggle_capture", { paused });
}

export function getCaptureState(): Promise<boolean> {
  return invoke("get_capture_state");
}

export function hidePopup(): Promise<void> {
  return invoke("hide_popup");
}

// ── Snippets ─────────────────────────────────────────────────────────────────

export function listSnippets(): Promise<Snippet[]> {
  return invoke("list_snippets");
}

export function findSnippets(query: string): Promise<Snippet[]> {
  return invoke("find_snippets", { query });
}

/** Pass id = null to create, id = number to update. Returns the snippet id. */
export function upsertSnippet(
  id: number | null,
  abbreviation: string,
  title: string,
  body: string,
): Promise<number> {
  return invoke("upsert_snippet", { id, abbreviation, title, body });
}

export function deleteSnippet(id: number): Promise<void> {
  return invoke("delete_snippet", { id });
}

export function pasteSnippet(id: number): Promise<void> {
  return invoke("paste_snippet", { id });
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/** Import snippets from a JSON string. Existing abbreviations get overwritten. */
export function importSnippets(json: string): Promise<ImportResult> {
  return invoke("import_snippets", { json });
}

/** Read a JSON file from the given path and import its snippets. */
export function importSnippetsFromFile(path: string): Promise<ImportResult> {
  return invoke("import_snippets_from_file", { path });
}
