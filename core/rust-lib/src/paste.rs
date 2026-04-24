use anyhow::{anyhow, Context, Result};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use clipboard_rs::common::RustImage;
use clipboard_rs::{Clipboard, ClipboardContext, RustImageData};
use enigo::{
    Direction::{Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use std::thread;
use std::time::Duration;

use crate::models::{ClipEntry, ContentType};

/// Write `entry` to the OS clipboard, then simulate Ctrl+V to paste into the
/// window that had focus before the popup opened. Caller should hide the
/// popup *before* calling this so focus returns to the previous app.
pub fn paste_entry(entry: &ClipEntry) -> Result<()> {
    write_to_clipboard(entry)?;
    thread::sleep(Duration::from_millis(50));
    send_ctrl_v()?;
    Ok(())
}

fn write_to_clipboard(entry: &ClipEntry) -> Result<()> {
    let ctx = ClipboardContext::new()
        .map_err(|e| anyhow!("clipboard ctx init failed: {e:?}"))?;

    match entry.content_type {
        ContentType::Text => {
            ctx.set_text(entry.content_data.clone())
                .map_err(|e| anyhow!("set_text failed: {e:?}"))?;
        }
        ContentType::Html => {
            ctx.set_html(entry.content_data.clone())
                .map_err(|e| anyhow!("set_html failed: {e:?}"))?;
        }
        ContentType::Rtf => {
            ctx.set_rich_text(entry.content_data.clone())
                .map_err(|e| anyhow!("set_rich_text failed: {e:?}"))?;
        }
        ContentType::Image => {
            let bytes = B64
                .decode(entry.content_data.as_bytes())
                .context("decode image base64")?;
            let img = RustImageData::from_bytes(&bytes)
                .map_err(|e| anyhow!("decode png failed: {e:?}"))?;
            ctx.set_image(img)
                .map_err(|e| anyhow!("set_image failed: {e:?}"))?;
        }
        ContentType::Files => {
            // clipboard-rs does not currently support setting file lists on
            // all platforms; fall back to joining paths as text.
            ctx.set_text(entry.content_text.clone())
                .map_err(|e| anyhow!("set_text (files fallback) failed: {e:?}"))?;
        }
    }
    Ok(())
}

/// Write plain text to the OS clipboard, then simulate Ctrl+V.
pub fn paste_text(text: &str) -> Result<()> {
    let ctx = ClipboardContext::new()
        .map_err(|e| anyhow!("clipboard ctx init failed: {e:?}"))?;
    ctx.set_text(text.to_string())
        .map_err(|e| anyhow!("set_text failed: {e:?}"))?;
    thread::sleep(Duration::from_millis(50));
    send_ctrl_v()?;
    Ok(())
}

fn send_ctrl_v() -> Result<()> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| anyhow!("enigo init failed: {e:?}"))?;
    enigo
        .key(Key::Control, Press)
        .map_err(|e| anyhow!("ctrl press: {e:?}"))?;
    enigo
        .key(Key::Unicode('v'), Press)
        .map_err(|e| anyhow!("v press: {e:?}"))?;
    enigo
        .key(Key::Unicode('v'), Release)
        .map_err(|e| anyhow!("v release: {e:?}"))?;
    enigo
        .key(Key::Control, Release)
        .map_err(|e| anyhow!("ctrl release: {e:?}"))?;
    Ok(())
}
