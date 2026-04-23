import { invoke } from "@tauri-apps/api/core";
import type { ClipEntry } from "./types";

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
