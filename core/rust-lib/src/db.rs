use anyhow::{Context, Result};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::Arc;

use crate::models::{ClipEntry, ContentType, NewClip, MAX_ENTRIES};

pub type DbHandle = Arc<Mutex<Connection>>;

/// Resolve `%APPDATA%\ClipSnap\history.db` on Windows, or the platform
/// equivalent on other OSes (useful for `cargo run` on macOS/Linux).
pub fn default_db_path() -> Result<PathBuf> {
    let mut dir = dirs::data_dir().context("no platform data dir available")?;
    dir.push("ClipSnap");
    std::fs::create_dir_all(&dir)
        .with_context(|| format!("failed to create data dir {}", dir.display()))?;
    dir.push("history.db");
    Ok(dir)
}

pub fn open(path: &PathBuf) -> Result<DbHandle> {
    let conn = Connection::open(path)
        .with_context(|| format!("failed to open sqlite at {}", path.display()))?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS entries (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            content_type  TEXT    NOT NULL,
            content_text  TEXT,
            content_data  BLOB,
            hash          TEXT    NOT NULL UNIQUE,
            byte_size     INTEGER NOT NULL,
            created_at    INTEGER NOT NULL,
            last_used_at  INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_last_used ON entries(last_used_at DESC);
        CREATE INDEX IF NOT EXISTS idx_hash ON entries(hash);
        "#,
    )?;
    Ok(Arc::new(Mutex::new(conn)))
}

pub fn hash_payload(content_type: ContentType, data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content_type.as_str().as_bytes());
    hasher.update(b"\x00");
    hasher.update(data.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Insert a new clip, or bump `last_used_at` if its hash already exists.
/// Returns the row id of the affected entry.
pub fn upsert_clip(db: &DbHandle, clip: &NewClip) -> Result<i64> {
    let now = Utc::now().timestamp_millis();
    let hash = hash_payload(clip.content_type, &clip.content_data);
    let conn = db.lock();

    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM entries WHERE hash = ?1",
            params![&hash],
            |row| row.get(0),
        )
        .optional()?;

    let id = if let Some(id) = existing {
        conn.execute(
            "UPDATE entries SET last_used_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        id
    } else {
        conn.execute(
            r#"
            INSERT INTO entries (
                content_type, content_text, content_data, hash,
                byte_size, created_at, last_used_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                clip.content_type.as_str(),
                clip.content_text,
                clip.content_data,
                hash,
                clip.byte_size,
                now,
                now,
            ],
        )?;
        conn.last_insert_rowid()
    };

    prune_locked(&conn, MAX_ENTRIES)?;
    Ok(id)
}

fn prune_locked(conn: &Connection, keep: i64) -> Result<()> {
    conn.execute(
        r#"
        DELETE FROM entries
        WHERE id IN (
            SELECT id FROM entries
            ORDER BY last_used_at DESC
            LIMIT -1 OFFSET ?1
        )
        "#,
        params![keep],
    )?;
    Ok(())
}

pub fn list(db: &DbHandle, limit: usize, offset: usize) -> Result<Vec<ClipEntry>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        r#"
        SELECT id, content_type, content_text, content_data, hash,
               byte_size, created_at, last_used_at
        FROM entries
        ORDER BY last_used_at DESC
        LIMIT ?1 OFFSET ?2
        "#,
    )?;
    let rows = stmt.query_map(params![limit as i64, offset as i64], row_to_entry)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

pub fn touch(db: &DbHandle, id: i64) -> Result<()> {
    let now = Utc::now().timestamp_millis();
    let conn = db.lock();
    conn.execute(
        "UPDATE entries SET last_used_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

pub fn get(db: &DbHandle, id: i64) -> Result<Option<ClipEntry>> {
    let conn = db.lock();
    let entry = conn
        .query_row(
            r#"
            SELECT id, content_type, content_text, content_data, hash,
                   byte_size, created_at, last_used_at
            FROM entries
            WHERE id = ?1
            "#,
            params![id],
            row_to_entry,
        )
        .optional()?;
    Ok(entry)
}

pub fn delete(db: &DbHandle, id: i64) -> Result<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn clear(db: &DbHandle) -> Result<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM entries", [])?;
    Ok(())
}

fn row_to_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<ClipEntry> {
    let ct_str: String = row.get(1)?;
    let content_type = ContentType::from_str(&ct_str).unwrap_or(ContentType::Text);
    Ok(ClipEntry {
        id: row.get(0)?,
        content_type,
        content_text: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
        content_data: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
        hash: row.get(4)?,
        byte_size: row.get(5)?,
        created_at: row.get(6)?,
        last_used_at: row.get(7)?,
    })
}
