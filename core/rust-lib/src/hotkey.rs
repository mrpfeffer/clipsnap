use anyhow::{Context, Result};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub const POPUP_LABEL: &str = "popup";

/// Ctrl+Shift+V global hotkey.
pub fn register(app: &AppHandle) -> Result<()> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV);
    let app_for_handler = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, sc, event| {
            if event.state == ShortcutState::Pressed && *sc == shortcut {
                if let Err(e) = toggle_popup(&app_for_handler) {
                    tracing::warn!("toggle_popup failed: {e:#}");
                }
            }
        })
        .context("failed to register Ctrl+Shift+V")?;
    Ok(())
}

pub fn toggle_popup(app: &AppHandle) -> Result<()> {
    let window = app
        .get_webview_window(POPUP_LABEL)
        .context("popup window not found")?;

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return Ok(());
    }

    if let Err(e) = center_on_cursor_monitor(&window) {
        tracing::debug!("center_on_cursor_monitor: {e:#}");
    }
    window.show()?;
    window.set_focus()?;
    let _ = app.emit("window-shown", ());
    Ok(())
}

pub fn hide_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(POPUP_LABEL) {
        let _ = w.hide();
    }
}

/// Center the popup on the monitor that currently contains the mouse cursor.
fn center_on_cursor_monitor(window: &tauri::WebviewWindow) -> Result<()> {
    let monitor = window
        .cursor_position()
        .ok()
        .and_then(|pos| window.available_monitors().ok().and_then(|mons| {
            mons.into_iter().find(|m| {
                let p = m.position();
                let s = m.size();
                let x = pos.x as i32;
                let y = pos.y as i32;
                x >= p.x
                    && x < p.x + s.width as i32
                    && y >= p.y
                    && y < p.y + s.height as i32
            })
        }))
        .or_else(|| window.primary_monitor().ok().flatten());

    let monitor = match monitor {
        Some(m) => m,
        None => return Ok(()),
    };

    let mpos = monitor.position();
    let msize = monitor.size();
    let wsize = window.outer_size().unwrap_or_default();

    let x = mpos.x + (msize.width as i32 - wsize.width as i32) / 2;
    let y = mpos.y + (msize.height as i32 - wsize.height as i32) / 3;
    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}
