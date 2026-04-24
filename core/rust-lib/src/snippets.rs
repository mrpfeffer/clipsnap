use anyhow::Result;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::db::DbHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: i64,
    pub abbreviation: String,
    pub title: String,
    pub body: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn init_table(db: &DbHandle) -> Result<()> {
    let conn = db.lock();
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS snippets (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            abbreviation TEXT    NOT NULL UNIQUE,
            title        TEXT    NOT NULL DEFAULT '',
            body         TEXT    NOT NULL,
            created_at   INTEGER NOT NULL,
            updated_at   INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_snippets_abbr ON snippets(abbreviation);
        "#,
    )?;
    Ok(())
}

pub fn list_all(db: &DbHandle) -> Result<Vec<Snippet>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, abbreviation, title, body, created_at, updated_at \
         FROM snippets ORDER BY abbreviation ASC",
    )?;
    let rows = stmt.query_map([], row_to_snippet)?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

/// Match abbreviation prefix first, then body/title contains — up to 10 results.
pub fn find_by_query(db: &DbHandle, query: &str) -> Result<Vec<Snippet>> {
    if query.is_empty() {
        return Ok(vec![]);
    }
    let q = query.to_lowercase();
    let prefix = format!("{}%", q);
    let contains = format!("%{}%", q);
    let conn = db.lock();
    let mut stmt = conn.prepare(
        r#"
        SELECT id, abbreviation, title, body, created_at, updated_at
        FROM snippets
        WHERE LOWER(abbreviation) LIKE ?1
           OR LOWER(title)        LIKE ?2
           OR LOWER(body)         LIKE ?2
        ORDER BY
            CASE WHEN LOWER(abbreviation) LIKE ?1 THEN 0 ELSE 1 END,
            abbreviation ASC
        LIMIT 10
        "#,
    )?;
    let rows = stmt.query_map(params![prefix, contains], row_to_snippet)?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
}

pub fn create(db: &DbHandle, abbreviation: &str, title: &str, body: &str) -> Result<i64> {
    let now = Utc::now().timestamp_millis();
    let conn = db.lock();
    conn.execute(
        "INSERT INTO snippets (abbreviation, title, body, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![abbreviation.trim(), title.trim(), body, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update(db: &DbHandle, id: i64, abbreviation: &str, title: &str, body: &str) -> Result<()> {
    let now = Utc::now().timestamp_millis();
    let conn = db.lock();
    conn.execute(
        "UPDATE snippets SET abbreviation = ?1, title = ?2, body = ?3, updated_at = ?4 \
         WHERE id = ?5",
        params![abbreviation.trim(), title.trim(), body, now, id],
    )?;
    Ok(())
}

pub fn delete(db: &DbHandle, id: i64) -> Result<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM snippets WHERE id = ?1", params![id])?;
    Ok(())
}

fn row_to_snippet(row: &rusqlite::Row<'_>) -> rusqlite::Result<Snippet> {
    Ok(Snippet {
        id: row.get(0)?,
        abbreviation: row.get(1)?,
        title: row.get(2)?,
        body: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
