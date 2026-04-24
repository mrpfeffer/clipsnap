# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace dependencies (run once after clone)
pnpm install

# Dev servers (hot-reload Rust + frontend)
pnpm dev:win          # Windows — launches Tauri dev window
pnpm dev:macos        # macOS — launches Tauri dev window

# Production builds
pnpm build:win        # → target/release/bundle/msi/*.msi + target/release/clipsnap.exe
pnpm build:macos      # → target/release/bundle/dmg/*.dmg

# Tests
pnpm test                        # frontend vitest (all)
pnpm --filter clipsnap-frontend test:watch   # frontend vitest watch mode
cargo test --workspace           # all Rust unit tests

# Static analysis (runs clippy + tsc + eslint together)
pnpm check            # or: bash scripts/check.sh

# Individual checks
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint src
cargo clippy --workspace --all-targets -- -D warnings
```

Running Rust tests locally on Linux requires system libs:
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libxdo-dev libxcb-shape0-dev libxcb-xfixes0-dev
```

## Architecture

### Workspace layout

```
core/rust-lib/   — clipsnap-core rlib: all business logic (DB, clipboard, hotkey, paste, snippets)
core/frontend/   — React 19 + TS + Tailwind v4 + Vite 7 (shared by all platforms)
win/src-tauri/   — Windows bundle shell: thin main.rs + Tauri config + capabilities
macos/src-tauri/ — macOS bundle shell: thin main.rs + Tauri config + capabilities
```

The platform shells (`win/`, `macos/`) contain only a 2-line `main.rs` that calls `clipsnap_core::run(tauri::generate_context!())`. All logic lives in `core/rust-lib`. The Tauri CLI is invoked via `pnpm --filter clipsnap-{win,macos} tauri {dev,build}`.

### Adding a new IPC command (end-to-end)

1. Implement the function in the relevant `core/rust-lib/src/*.rs` module.
2. Add a `#[tauri::command]` wrapper in `core/rust-lib/src/commands.rs`.
3. Register it in the `invoke_handler![]` macro in `core/rust-lib/src/lib.rs`.
4. Add a typed `invoke("command_name", { ...args })` wrapper in `core/frontend/src/lib/ipc.ts`.

### Database

`DbHandle = Arc<Mutex<Connection>>` (rusqlite + parking_lot). Managed as Tauri state. Two tables:
- `entries` — clipboard history; SHA-256 deduped; capped at 1 000 rows via `prune_locked`; sorted by `last_used_at DESC`.
- `snippets` — text expander templates with `abbreviation`, `title`, `body`.

Data lives at `dirs::data_dir()/ClipSnap/history.db`:
- Windows: `%APPDATA%\ClipSnap\history.db`
- macOS: `~/Library/Application Support/ClipSnap/history.db`

Rust unit tests use `Connection::open_in_memory()` via a `test_db()` helper — no temp files needed.

### Frontend data flow

`useClipboardHistory` polls on mount and re-fetches on the `clipboard-changed` Tauri event. `useFuzzySearch` runs fuse.js (threshold 0.4) over the fetched entries. The combined list passed to `HistoryList` is a `ListEntry` discriminated union:

```ts
type ListEntry = { kind: "clip"; data: ClipEntry } | { kind: "snippet"; data: Snippet }
```

Snippet matches (from `findSnippets`) are prepended to fuzzy clip results whenever the search query is non-empty.

### Tauri events

| Rust `app.emit(...)` | Frontend `listen(...)` | Purpose |
|---|---|---|
| `"clipboard-changed"` | `useClipboardHistory` | Refresh list after new clip captured |
| `"window-shown"` | `App.tsx` | Reset to history tab + focus search on hotkey |
| `"open-snippets-tab"` | `App.tsx` | Switch to Snippets tab (tray "Manage Snippets") |

### Platform-specific behaviour in shared code

- **Paste shortcut** (`core/rust-lib/src/paste.rs`): `#[cfg(target_os = "macos")]` uses `Key::Meta` (Cmd+V); all other platforms use `Key::Control` (Ctrl+V).
- **Dock visibility** (`core/rust-lib/src/lib.rs`): `#[cfg(target_os = "macos")]` calls `app.set_activation_policy(Accessory)` to hide from Dock.
- **Autostart tray label**: `cfg!(target_os = "windows")` → "Start with Windows", else "Start at Login".

### Clipboard watcher

`clipboard_watcher::spawn` launches a dedicated thread running `clipboard-rs`'s `ClipboardWatcherContext::start_watch()` (event-driven, no polling). The watcher checks `WatcherState.paused` (AtomicBool) before each capture. Priority order: files → image → html → rtf → text.

### macOS notes

The first paste operation will trigger a macOS Accessibility permission dialog — this is required for `enigo` to simulate Cmd+V. Release builds are unsigned; users must right-click → Open on first launch to bypass Gatekeeper. The `.icns` icons are shared from `win/src-tauri/icons/` via relative paths in `macos/src-tauri/tauri.conf.json`.
