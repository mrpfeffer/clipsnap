//! `clipsnap-core` — shared, OS-independent app logic for ClipSnap.

mod clipboard_watcher;
mod commands;
mod db;
mod hotkey;
mod models;
mod paste;
mod snippets;

use std::sync::atomic::Ordering;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, Wry, WindowEvent,
};
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};

use crate::clipboard_watcher::WatcherState;

pub fn run(context: tauri::Context<Wry>) {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let db_path = db::default_db_path()?;
            tracing::info!("db at {}", db_path.display());
            let db_handle = db::open(&db_path)?;

            snippets::init_table(&db_handle)?;

            let watcher_state = WatcherState::new();
            let paused = watcher_state.paused.clone();

            app.manage(db_handle.clone());
            app.manage(watcher_state);

            hotkey::register(&app.handle())?;
            clipboard_watcher::spawn(app.handle().clone(), db_handle, paused);

            build_tray(&app.handle())?;

            let autostart = app.autolaunch();
            let _ = autostart;

            if let Some(window) = app.get_webview_window(hotkey::POPUP_LABEL) {
                let app_handle = app.handle().clone();
                window.on_window_event(move |ev| {
                    if let WindowEvent::Focused(false) = ev {
                        hotkey::hide_popup(&app_handle);
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_history,
            commands::search_history,
            commands::paste_entry,
            commands::delete_entry,
            commands::clear_history,
            commands::toggle_capture,
            commands::get_capture_state,
            commands::hide_popup,
            commands::list_snippets,
            commands::find_snippets,
            commands::upsert_snippet,
            commands::delete_snippet,
            commands::paste_snippet,
        ])
        .run(context)
        .expect("error while running ClipSnap");
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let open_item = MenuItemBuilder::with_id("open", "Open (Ctrl+Shift+V)").build(app)?;
    let snippets_item = MenuItemBuilder::with_id("snippets", "Manage Snippets").build(app)?;
    let pause_item = MenuItemBuilder::with_id("pause", "Pause Capture").build(app)?;
    let clear_item = MenuItemBuilder::with_id("clear", "Clear History…").build(app)?;
    let autostart_item =
        MenuItemBuilder::with_id("autostart", "Start with Windows").build(app)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit ClipSnap").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[
            &open_item,
            &snippets_item,
            &sep,
            &pause_item,
            &autostart_item,
            &clear_item,
            &sep2,
            &quit_item,
        ])
        .build()?;

    let _tray = TrayIconBuilder::with_id("main")
        .tooltip("ClipSnap")
        .icon(app.default_window_icon().cloned().unwrap())
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => {
                if let Err(e) = hotkey::toggle_popup(app) {
                    tracing::warn!("open from tray: {e:#}");
                }
            }
            "snippets" => {
                if let Err(e) = hotkey::show_popup(app) {
                    tracing::warn!("show popup for snippets: {e:#}");
                }
                let _ = app.emit("open-snippets-tab", ());
            }
            "pause" => {
                if let Some(state) = app.try_state::<WatcherState>() {
                    let now = state.paused.load(Ordering::Relaxed);
                    state.paused.store(!now, Ordering::Relaxed);
                    let _ = app.emit("capture-state-changed", !now);
                }
            }
            "clear" => {
                if let Some(db) = app.try_state::<db::DbHandle>() {
                    if let Err(e) = db::clear(&db) {
                        tracing::warn!("clear: {e:#}");
                    }
                    let _ = app.emit("clipboard-changed", ());
                }
            }
            "autostart" => {
                let am = app.autolaunch();
                let enabled = am.is_enabled().unwrap_or(false);
                let res = if enabled { am.disable() } else { am.enable() };
                if let Err(e) = res {
                    tracing::warn!("autostart toggle: {e:#}");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    let _ = MacosLauncher::LaunchAgent;
    Ok(())
}
