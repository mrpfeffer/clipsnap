use anyhow::{Context, Result};
use tauri::{AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewWindow};
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

    show_and_position(&window)?;
    let _ = app.emit("window-shown", ());
    Ok(())
}

/// Show the popup unconditionally and center it on the cursor monitor.
pub fn show_popup(app: &AppHandle) -> Result<()> {
    let window = app
        .get_webview_window(POPUP_LABEL)
        .context("popup window not found")?;
    show_and_position(&window)
}

pub fn hide_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(POPUP_LABEL) {
        let _ = w.hide();
    }
    // On macOS, hiding the window alone does not reliably return key focus
    // to the previously active app — especially with `ActivationPolicy::
    // Accessory`. Hiding the whole app (NSApp.hide(nil)) makes the OS
    // restore the prior frontmost app, which is what `enigo`'s synthesized
    // Cmd+V needs in order to land in the right window.
    #[cfg(target_os = "macos")]
    let _ = app.hide();
}

/// Move the (currently hidden) window onto the cursor's monitor, **then**
/// show, **then** center. Reading `outer_size()` before `show()` returns
/// stale or zero values on macOS for hidden windows; doing it in this order
/// guarantees the centering math has the real window size.
fn show_and_position(window: &WebviewWindow) -> Result<()> {
    let target = pick_cursor_monitor(window);

    // 1) Park the hidden window somewhere on the target monitor so that
    //    `current_monitor()` reports the right one after `show()`.
    if let Some(m) = &target {
        let mpos = m.position();
        let msize = m.size();
        let parked_x = mpos.x + (msize.width as i32 / 4);
        let parked_y = mpos.y + (msize.height as i32 / 4);
        let _ = window.set_position(PhysicalPosition::new(parked_x, parked_y));
    }

    // 2) Show + focus. After this, `outer_size()` reflects the real size.
    window.show()?;
    window.set_focus()?;

    // 3) Re-resolve the monitor (in case the user moved the cursor between
    //    the parking and the show), then center horizontally + ~⅓ down,
    //    clamped to the monitor's visible area.
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or(target)
        .or_else(|| window.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        if let Err(e) = clamp_into_monitor(window, &m) {
            tracing::debug!("clamp_into_monitor: {e:#}");
        }
    }
    Ok(())
}

/// Find the monitor that contains the OS cursor; fall back to primary.
fn pick_cursor_monitor(window: &WebviewWindow) -> Option<Monitor> {
    let pos = window.cursor_position().ok()?;
    let monitors = window.available_monitors().ok()?;
    monitors
        .into_iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            let x = pos.x as i32;
            let y = pos.y as i32;
            x >= p.x
                && x < p.x + s.width as i32
                && y >= p.y
                && y < p.y + s.height as i32
        })
        .or_else(|| window.primary_monitor().ok().flatten())
}

/// Center horizontally, place ~⅓ down vertically, then clamp so the window
/// can never extend past any edge of the monitor.
fn clamp_into_monitor(window: &WebviewWindow, monitor: &Monitor) -> Result<()> {
    let mpos = monitor.position();
    let msize = monitor.size();
    let wsize = window.outer_size().unwrap_or_default();

    // If outer_size is still bogus (zero), bail rather than placing wrongly.
    if wsize.width == 0 || wsize.height == 0 {
        return Ok(());
    }

    let mw = msize.width as i32;
    let mh = msize.height as i32;
    let ww = wsize.width as i32;
    let wh = wsize.height as i32;

    // Desired position: horizontally centered, ~⅓ down.
    let mut x = mpos.x + (mw - ww) / 2;
    let mut y = mpos.y + (mh - wh) / 3;

    // Clamp to monitor bounds. If the window is somehow larger than the
    // monitor (extreme zoom, etc.), `max_x < min_x` — pin to top-left.
    let min_x = mpos.x;
    let max_x = mpos.x + (mw - ww).max(0);
    let min_y = mpos.y;
    let max_y = mpos.y + (mh - wh).max(0);
    x = x.clamp(min_x, max_x);
    y = y.clamp(min_y, max_y);

    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}
