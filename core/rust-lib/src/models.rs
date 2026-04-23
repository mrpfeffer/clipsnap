use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    Text,
    Rtf,
    Html,
    Image,
    Files,
}

impl ContentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContentType::Text => "text",
            ContentType::Rtf => "rtf",
            ContentType::Html => "html",
            ContentType::Image => "image",
            ContentType::Files => "files",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "text" => Some(ContentType::Text),
            "rtf" => Some(ContentType::Rtf),
            "html" => Some(ContentType::Html),
            "image" => Some(ContentType::Image),
            "files" => Some(ContentType::Files),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipEntry {
    pub id: i64,
    pub content_type: ContentType,
    /// Plain-text preview (always populated for search).
    pub content_text: String,
    /// For text/rtf/html: the raw payload string.
    /// For image: base64-encoded PNG.
    /// For files: JSON array of paths.
    pub content_data: String,
    pub hash: String,
    pub byte_size: i64,
    pub created_at: i64,
    pub last_used_at: i64,
}

/// Payload coming in from the clipboard watcher, not yet hashed/stored.
#[derive(Debug, Clone)]
pub struct NewClip {
    pub content_type: ContentType,
    pub content_text: String,
    pub content_data: String,
    pub byte_size: i64,
}

/// 5 MB per-entry ceiling for images.
pub const MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;

/// History is pruned to this many most-recently-used entries.
pub const MAX_ENTRIES: i64 = 1000;
