//! Tiny key/value settings store living in the same SQLite database as the
//! rest of the app. Used for things that need to survive a restart but
//! don't justify a dedicated table — e.g. the text-expander hotkey and
//! enabled flag.

use anyhow::Result;
use rusqlite::{params, OptionalExtension};

use crate::db::DbHandle;

pub fn init_table(db: &DbHandle) -> Result<()> {
    let conn = db.lock();
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

pub fn get(db: &DbHandle, key: &str) -> Result<Option<String>> {
    let conn = db.lock();
    let v: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |r| r.get::<_, String>(0),
        )
        .optional()?;
    Ok(v)
}

pub fn set(db: &DbHandle, key: &str, value: &str) -> Result<()> {
    let conn = db.lock();
    conn.execute(
        r#"
        INSERT INTO settings (key, value) VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        "#,
        params![key, value],
    )?;
    Ok(())
}

/// Convenience: read a key, defaulting to `default` when missing.
pub fn get_or(db: &DbHandle, key: &str, default: &str) -> Result<String> {
    Ok(get(db, key)?.unwrap_or_else(|| default.to_string()))
}

/// Convenience: read a "true"/"false" flag, defaulting to `default` when
/// missing or unparsable.
pub fn get_bool(db: &DbHandle, key: &str, default: bool) -> Result<bool> {
    match get(db, key)? {
        Some(v) => match v.as_str() {
            "true" | "1" => Ok(true),
            "false" | "0" => Ok(false),
            _ => Ok(default),
        },
        None => Ok(default),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use parking_lot::Mutex;
    use rusqlite::Connection;
    use std::sync::Arc;

    fn test_db() -> DbHandle {
        let conn = Connection::open_in_memory().unwrap();
        let db = Arc::new(Mutex::new(conn));
        init_table(&db).unwrap();
        db
    }

    #[test]
    fn missing_key_returns_none() {
        let db = test_db();
        assert!(get(&db, "no.such.key").unwrap().is_none());
    }

    #[test]
    fn set_then_get_round_trip() {
        let db = test_db();
        set(&db, "foo", "bar").unwrap();
        assert_eq!(get(&db, "foo").unwrap().as_deref(), Some("bar"));
    }

    #[test]
    fn set_overwrites_existing_value() {
        let db = test_db();
        set(&db, "k", "v1").unwrap();
        set(&db, "k", "v2").unwrap();
        assert_eq!(get(&db, "k").unwrap().as_deref(), Some("v2"));
    }

    #[test]
    fn get_or_returns_default_for_missing_key() {
        let db = test_db();
        assert_eq!(get_or(&db, "k", "fallback").unwrap(), "fallback");
        set(&db, "k", "set").unwrap();
        assert_eq!(get_or(&db, "k", "fallback").unwrap(), "set");
    }

    #[test]
    fn get_bool_parses_known_truthy_and_falsy_strings() {
        let db = test_db();
        set(&db, "t1", "true").unwrap();
        set(&db, "t2", "1").unwrap();
        set(&db, "f1", "false").unwrap();
        set(&db, "f2", "0").unwrap();
        set(&db, "weird", "maybe").unwrap();
        assert!(get_bool(&db, "t1", false).unwrap());
        assert!(get_bool(&db, "t2", false).unwrap());
        assert!(!get_bool(&db, "f1", true).unwrap());
        assert!(!get_bool(&db, "f2", true).unwrap());
        // Unparsable → default (test both polarities).
        assert!(get_bool(&db, "weird", true).unwrap());
        assert!(!get_bool(&db, "weird", false).unwrap());
    }

    #[test]
    fn get_bool_returns_default_for_missing_key() {
        let db = test_db();
        assert!(get_bool(&db, "absent", true).unwrap());
        assert!(!get_bool(&db, "absent", false).unwrap());
    }
}
