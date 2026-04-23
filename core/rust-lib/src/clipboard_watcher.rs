use anyhow::Result;
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use clipboard_rs::common::RustImage;
use clipboard_rs::{
    Clipboard, ClipboardContext, ClipboardHandler, ClipboardWatcher, ClipboardWatcherContext,
    ContentFormat,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

use crate::db::{upsert_clip, DbHandle};
use crate::models::{ContentType, NewClip, MAX_IMAGE_BYTES};

pub struct WatcherState {
    pub paused: Arc<AtomicBool>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            paused: Arc::new(AtomicBool::new(false)),
        }
    }
}

struct Handler {
    ctx: ClipboardContext,
    db: DbHandle,
    app: AppHandle,
    paused: Arc<AtomicBool>,
}

impl ClipboardHandler for Handler {
    fn on_clipboard_change(&mut self) {
        if self.paused.load(Ordering::Relaxed) {
            return;
        }
        if let Err(e) = self.capture() {
            tracing::warn!("clipboard capture failed: {e:#}");
        }
    }
}

impl Handler {
    fn capture(&self) -> Result<()> {
        // Priority: files > image > html > rtf > text.
        if self.ctx.has(ContentFormat::Files) {
            if let Ok(paths) = self.ctx.get_files() {
                if !paths.is_empty() {
                    let json = serde_json::to_string(&paths)?;
                    let text = paths.join("\n");
                    let byte_size = json.len() as i64;
                    self.store(NewClip {
                        content_type: ContentType::Files,
                        content_text: text,
                        content_data: json,
                        byte_size,
                    })?;
                    return Ok(());
                }
            }
        }
        if self.ctx.has(ContentFormat::Image) {
            if let Ok(img) = self.ctx.get_image() {
                let (w, h) = img.get_size();
                if let Ok(png) = img.to_png() {
                    let bytes = png.get_bytes();
                    if bytes.len() <= MAX_IMAGE_BYTES {
                        let b64 = B64.encode(bytes);
                        let text = format!("[image {}×{} · {} B]", w, h, bytes.len());
                        let byte_size = bytes.len() as i64;
                        self.store(NewClip {
                            content_type: ContentType::Image,
                            content_text: text,
                            content_data: b64,
                            byte_size,
                        })?;
                        return Ok(());
                    } else {
                        tracing::debug!(
                            "image skipped: {} bytes exceeds cap {}",
                            bytes.len(),
                            MAX_IMAGE_BYTES
                        );
                    }
                }
            }
        }
        if self.ctx.has(ContentFormat::Html) {
            if let Ok(html) = self.ctx.get_html() {
                if !html.trim().is_empty() {
                    let text = strip_html(&html);
                    let byte_size = html.len() as i64;
                    self.store(NewClip {
                        content_type: ContentType::Html,
                        content_text: text,
                        content_data: html,
                        byte_size,
                    })?;
                    return Ok(());
                }
            }
        }
        if self.ctx.has(ContentFormat::Rtf) {
            if let Ok(rtf) = self.ctx.get_rich_text() {
                if !rtf.trim().is_empty() {
                    let text = strip_rtf(&rtf);
                    let byte_size = rtf.len() as i64;
                    self.store(NewClip {
                        content_type: ContentType::Rtf,
                        content_text: text,
                        content_data: rtf,
                        byte_size,
                    })?;
                    return Ok(());
                }
            }
        }
        if self.ctx.has(ContentFormat::Text) {
            if let Ok(text) = self.ctx.get_text() {
                if !text.trim().is_empty() {
                    let byte_size = text.len() as i64;
                    self.store(NewClip {
                        content_type: ContentType::Text,
                        content_text: text.clone(),
                        content_data: text,
                        byte_size,
                    })?;
                    return Ok(());
                }
            }
        }
        Ok(())
    }

    fn store(&self, clip: NewClip) -> Result<()> {
        let _id = upsert_clip(&self.db, &clip)?;
        let _ = self.app.emit("clipboard-changed", ());
        Ok(())
    }
}

pub fn spawn(app: AppHandle, db: DbHandle, paused: Arc<AtomicBool>) {
    thread::Builder::new()
        .name("clipboard-watcher".into())
        .spawn(move || {
            let ctx = match ClipboardContext::new() {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("clipboard context init failed: {e:?}");
                    return;
                }
            };
            let mut watcher = match ClipboardWatcherContext::new() {
                Ok(w) => w,
                Err(e) => {
                    tracing::error!("clipboard watcher init failed: {e:?}");
                    return;
                }
            };
            watcher.add_handler(Handler {
                ctx,
                db,
                app,
                paused,
            });
            watcher.start_watch();
        })
        .expect("failed to spawn clipboard watcher thread");
}

/// Extremely minimal RTF → plain-text extractor: strips control words and
/// braces so the preview is readable. RTF paste itself uses the raw payload.
fn strip_rtf(rtf: &str) -> String {
    let mut out = String::with_capacity(rtf.len() / 2);
    let mut in_ctrl = false;
    for ch in rtf.chars() {
        match ch {
            '\\' => {
                in_ctrl = true;
            }
            '{' | '}' => {
                in_ctrl = false;
            }
            ' ' | '\n' | '\r' | '\t' if in_ctrl => {
                in_ctrl = false;
            }
            _ if in_ctrl => {}
            _ => out.push(ch),
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Extremely minimal HTML → plain-text: drops tags.
fn strip_html(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}
