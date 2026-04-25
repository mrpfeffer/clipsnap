use std::sync::atomic::Ordering;
use tauri::{AppHandle, State};

use crate::clipboard_watcher::WatcherState;
use crate::db::{self, DbHandle};
use crate::hotkey;
use crate::models::ClipEntry;
use crate::paste;
use crate::snippets::{self, ImportResult, Snippet};

fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ── Clipboard history ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_history(
    db: State<'_, DbHandle>,
    limit: usize,
    offset: usize,
) -> Result<Vec<ClipEntry>, String> {
    db::list(&db, limit, offset).map_err(map_err)
}

#[tauri::command]
pub fn search_history(
    db: State<'_, DbHandle>,
    query: String,
    limit: usize,
) -> Result<Vec<ClipEntry>, String> {
    let all = db::list(&db, 1000, 0).map_err(map_err)?;
    let q = query.to_lowercase();
    if q.is_empty() {
        return Ok(all.into_iter().take(limit).collect());
    }
    let filtered: Vec<_> = all
        .into_iter()
        .filter(|e| e.content_text.to_lowercase().contains(&q))
        .take(limit)
        .collect();
    Ok(filtered)
}

#[tauri::command]
pub fn paste_entry(
    app: AppHandle,
    db: State<'_, DbHandle>,
    id: i64,
) -> Result<(), String> {
    let entry = db::get(&db, id)
        .map_err(map_err)?
        .ok_or_else(|| "entry not found".to_string())?;

    hotkey::hide_popup(&app);
    paste::paste_entry(&entry).map_err(map_err)?;
    db::touch(&db, id).map_err(map_err)?;
    Ok(())
}

#[tauri::command]
pub fn delete_entry(db: State<'_, DbHandle>, id: i64) -> Result<(), String> {
    db::delete(&db, id).map_err(map_err)
}

#[tauri::command]
pub fn clear_history(db: State<'_, DbHandle>) -> Result<(), String> {
    db::clear(&db).map_err(map_err)
}

#[tauri::command]
pub fn toggle_capture(state: State<'_, WatcherState>, paused: bool) -> Result<(), String> {
    state.paused.store(paused, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn get_capture_state(state: State<'_, WatcherState>) -> bool {
    state.paused.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn hide_popup(app: AppHandle) -> Result<(), String> {
    hotkey::hide_popup(&app);
    Ok(())
}

// ── Snippets ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn list_snippets(db: State<'_, DbHandle>) -> Result<Vec<Snippet>, String> {
    snippets::list_all(&db).map_err(map_err)
}

#[tauri::command]
pub fn find_snippets(
    db: State<'_, DbHandle>,
    query: String,
) -> Result<Vec<Snippet>, String> {
    snippets::find_by_query(&db, &query).map_err(map_err)
}

/// Create (id = null) or update (id = some) a snippet.
#[tauri::command]
pub fn upsert_snippet(
    db: State<'_, DbHandle>,
    id: Option<i64>,
    abbreviation: String,
    title: String,
    body: String,
) -> Result<i64, String> {
    match id {
        None => snippets::create(&db, &abbreviation, &title, &body).map_err(map_err),
        Some(existing_id) => {
            snippets::update(&db, existing_id, &abbreviation, &title, &body)
                .map_err(map_err)?;
            Ok(existing_id)
        }
    }
}

#[tauri::command]
pub fn delete_snippet(db: State<'_, DbHandle>, id: i64) -> Result<(), String> {
    snippets::delete(&db, id).map_err(map_err)
}

/// Paste a snippet: hide the popup, write body to clipboard, simulate Ctrl+V.
#[tauri::command]
pub fn paste_snippet(
    app: AppHandle,
    db: State<'_, DbHandle>,
    id: i64,
) -> Result<(), String> {
    let snippet = snippets::list_all(&db)
        .map_err(map_err)?
        .into_iter()
        .find(|s| s.id == id)
        .ok_or_else(|| "snippet not found".to_string())?;

    hotkey::hide_popup(&app);
    paste::paste_text(&snippet.body).map_err(map_err)?;
    Ok(())
}

/// Import snippets from a JSON document. Existing rows with the same
/// abbreviation are overwritten. Per-row errors are returned in the result
/// instead of aborting the whole import.
#[tauri::command]
pub fn import_snippets(
    db: State<'_, DbHandle>,
    json: String,
) -> Result<ImportResult, String> {
    snippets::import_from_json(&db, &json).map_err(map_err)
}
