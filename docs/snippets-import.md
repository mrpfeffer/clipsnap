# Snippet import (JSON)

ClipSnap can bulk-import snippets from a JSON file. This is the fastest way to seed the app with your existing templates, share snippet libraries between machines, or back up your collection.

## How to import

1. Open the popup with `Ctrl+Shift+V`.
2. Click the **Snippets** tab in the upper-right of the header.
3. Click **Import** (top-right of the snippet list).
4. The native file picker opens (NSOpenPanel on macOS, OpenFileDialog on Windows). Select a `.json` file.

Result is shown as a one-line status:

```
Imported 5
Imported 4, skipped 1 — #2 (mfg): body is empty
```

The full list refreshes automatically.

## File format

Two top-level shapes are accepted:

### Bare array

```json
[
  {
    "abbreviation": "mfg",
    "title": "Mit freundlichen Grüßen",
    "body": "Mit freundlichen Grüßen,\n\nMartin Pfeffer"
  },
  {
    "abbreviation": "addr",
    "body": "Some Street 1\n12345 City"
  }
]
```

### Wrapped object

```json
{
  "snippets": [
    { "abbreviation": "mfg", "title": "Mit freundlichen Grüßen", "body": "…" },
    { "abbreviation": "addr", "body": "…" }
  ]
}
```

The wrapped form is preferred when you want to extend the schema later (e.g., add a top-level `version`, `metadata`, etc.) without breaking the parser.

## Field reference

| Field          | Required | Type   | Notes                                                          |
|----------------|----------|--------|----------------------------------------------------------------|
| `abbreviation` | yes      | string | Trimmed; must be non-empty after trim. Unique per database.    |
| `title`        | no       | string | Defaults to empty. Trimmed. Shown as the secondary list label. |
| `body`         | yes      | string | Must be non-empty after trim. Pasted verbatim — newlines kept. |

## Semantics

- **Upsert by `abbreviation`.** If a snippet with the same abbreviation already exists, ClipSnap overwrites its title and body and bumps `updated_at`. The original `created_at` is preserved.
- **Per-row error tolerance.** A row with a missing field doesn't abort the whole import — it's counted as "skipped" with the index and abbreviation in the error list.
- **Order-sensitive duplicates within a file.** If your file has two rows with the same abbreviation, the *last* one wins (each row is upserted in document order).
- **Whitespace trimming.** Leading/trailing whitespace is stripped from `abbreviation` and `title`. The `body` is preserved exactly — leading spaces and trailing newlines you put in your file end up in the paste.
- **JSON parse errors abort.** A malformed file produces a single error string; nothing is written.

## Sample file

A small example lives at [`docs/snippets-example.json`](./snippets-example.json). To try it:

1. Open ClipSnap (`Ctrl+Shift+V`)
2. **Snippets** tab → **Import**
3. Select `docs/snippets-example.json`

You should see three new entries: `addr`, `email`, `mfg`.

## Programmatic export (manual)

There is no built-in export command yet. To dump current snippets to JSON, query the SQLite database directly:

```bash
# macOS
sqlite3 "$HOME/Library/Application Support/ClipSnap/history.db" \
  "SELECT json_group_array(json_object('abbreviation', abbreviation, 'title', title, 'body', body)) FROM snippets;" \
  | jq . > my-snippets.json

# Windows (PowerShell)
sqlite3 "$env:APPDATA\ClipSnap\history.db" `
  "SELECT json_group_array(json_object('abbreviation', abbreviation, 'title', title, 'body', body)) FROM snippets;" `
  | ConvertFrom-Json | ConvertTo-Json -Depth 5 > my-snippets.json
```

The output is directly re-importable.

## IPC surface (for integrators)

Two commands cover the import path. Both return `ImportResult`:

```ts
interface ImportResult {
  imported: number;   // rows written (insert + update)
  skipped: number;    // rows that failed validation
  errors: string[];   // per-row error messages, "#<idx> (<abbr>): <reason>"
}
```

| Command                                | Use when                                                      |
|----------------------------------------|---------------------------------------------------------------|
| `import_snippets(json: String)`        | You already have the JSON in memory (e.g., from a Tauri event, paste, or in-memory generation). |
| `import_snippets_from_file(path: String)` | You have a filesystem path (typical case after `dialog.open()`). Rust reads the file with `std::fs::read_to_string` then runs the same parser. |

Frontend wrapper used by the Snippets tab:

```ts
import { open } from "@tauri-apps/plugin-dialog";
import { importSnippetsFromFile } from "../lib/ipc";

const selected = await open({
  multiple: false,
  directory: false,
  filters: [{ name: "JSON", extensions: ["json"] }],
  title: "Select snippets JSON file",
});
if (selected) {
  const result = await importSnippetsFromFile(selected);
}
```

Backend implementation: [`core/rust-lib/src/snippets.rs::import_from_json`](../core/rust-lib/src/snippets.rs) and [`core/rust-lib/src/commands.rs::import_snippets_from_file`](../core/rust-lib/src/commands.rs).

## Testing

Six unit tests cover the import path (run with `cargo test --workspace`):

| Test                                          | Asserts                                                   |
|-----------------------------------------------|-----------------------------------------------------------|
| `import_bare_array_inserts_each_row`          | Bare array → all rows inserted                            |
| `import_wrapped_object_form_works`            | `{snippets: [...]}` form parses + inserts                 |
| `import_skips_rows_with_missing_fields`       | Empty `abbreviation` or `body` are skipped, not aborted   |
| `import_overwrites_existing_abbreviation`     | Re-import upserts in place — no duplicate row             |
| `import_invalid_json_returns_err`             | Malformed JSON returns an `Err`, no DB writes             |
| `import_trims_abbreviation_whitespace`        | Whitespace trimming on `abbreviation`                     |
