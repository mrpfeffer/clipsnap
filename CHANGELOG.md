# Changelog

All notable changes to ClipSnap are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] — 2026-04-25

### Fixed

- **Import button appeared to crash the app on macOS.** When the native file dialog (`NSOpenPanel`) opened, the popup window lost focus, which fired our existing `Focused(false)` window event → `hide_popup()` ran → the popup vanished. The dialog often stayed half-up but with its parent gone, the user perceived the whole app as having crashed. — *#fix(snippets)*

### Added

- New `UiState { suppress_hide: AtomicBool }` shared state and IPC command `set_suppress_hide(suppress: bool)`. The Snippets-tab Import handler now wraps the `dialog.open()` call in `setSuppressHide(true) … finally setSuppressHide(false)` so the popup stays put while NSOpenPanel owns focus.
- `core/rust-lib/src/ui_state.rs` — new module owning the shared UI flag.

### Changed

- The popup's `Focused(false)` handler in `lib.rs` consults the suppress flag before calling `hide_popup`. Default behaviour (auto-hide on click-outside, Esc, alt-tab) is unchanged.

## [0.2.2] — 2026-04-25

### Fixed

- **JSON snippet import was broken on macOS.** The 0.2.1 implementation used a hidden `<input type="file">` triggered by `.click()` from React. WKWebView (Tauri's macOS renderer) does not reliably surface a native file picker for hidden inputs in this pattern, so the Import button appeared to do nothing on macOS. — *#fix(snippets)*

### Changed

- **Switched the snippet-import file picker to `tauri-plugin-dialog`.** The Import button now opens the native NSOpenPanel / Win32 OpenFileDialog via `@tauri-apps/plugin-dialog`'s `open()`, with a `.json` filter and a localized "Select snippets JSON file" title. Selected path is read in Rust (`std::fs::read_to_string`) and parsed by the existing `import_from_json` pipeline.

### Added

- New IPC command `import_snippets_from_file(path: String) -> ImportResult` (in addition to the existing `import_snippets(json: String)` which is still used by tests).
- `tauri-plugin-dialog` workspace dep + capability permission `dialog:allow-open` in both the Windows and macOS shells.
- Import button shows "Importing…" while the dialog/import is in flight.
- **5 themed example JSON files** under `docs/examples/snippets/` — `getting-started.json` (3 entries), `signatures.json` (4), `dev.json` (8), `markdown.json` (5), `wrapped-form.json` (2, demonstrates the `{ snippets: [...] }` shape). Each is a stand-alone, ready-to-import file; the folder has its own `README.md` indexing them and showing how to merge multiple files via `jq -s 'add'`.
- `docs/snippets-import.md` extended with a Tips & anti-patterns section.
- Root `README.md` Snippet-import section now lists all example files in a table instead of a placeholder code block.

## [0.2.1] — 2026-04-25

### Added

- **JSON snippet import** — bulk-load snippets from a `.json` file via **Snippets → Import** in the popup. Existing abbreviations are upserted in place, so re-importing the same file is idempotent. Both `[…]` (bare array) and `{ "snippets": [...] }` (wrapped) shapes are accepted; per-row failures are collected in the result without aborting the whole import. See [`docs/snippets-import.md`](./docs/snippets-import.md) for the schema and [`docs/snippets-example.json`](./docs/snippets-example.json) for a sample. — *#feat(snippets)*
- **`macos/README.md`** with installation, Gatekeeper bypass, Accessibility-permission setup, and troubleshooting (DMG bundle failures, missing tray icon).
- **`docs/snippets-import.md`** — full reference: file format, field semantics, sample-file walkthrough, manual export recipe via `sqlite3` + `jq`, IPC surface, test matrix.
- **`CHANGELOG.md`** (this file).
- **6 new Rust unit tests** for the snippet import path (`cargo test --workspace`: 27 → 33).

### Fixed

- **CI was failing** with `ERR_PNPM_OUTDATED_LOCKFILE` because `macos/package.json` (added in 0.2.0) declared `@tauri-apps/cli` without a lockfile refresh. The lockfile is now in sync. — *#fix(ci)*
- **macOS build was broken** in 0.2.0:
  - `tauri.conf.json` declared `macOSPrivateApi: true` but the corresponding `tauri/macos-private-api` cargo feature was not enabled — `tauri-build` aborted. — *#fix(build)*
  - `app.set_activation_policy(...)` was wrapped in `if let Err(e) = …`, but the function returns `()`, not `Result`. The whole crate failed to typecheck on macOS. — *#fix(build)*
- **Multi-monitor popup placement** — the popup occasionally opened in the bottom-right of the active monitor and could even extend past the screen edge, most reliably reproducible on mixed-DPI setups (MacBook Retina + external display). The show/position pipeline was restructured: pick cursor monitor first, park the hidden window onto it, **then** `show()` + `set_focus()` (so `outer_size()` returns a real value), then re-resolve the monitor and finally call new helper `clamp_into_monitor()` which hard-clamps `x`/`y` to the monitor's bounds so the window can never overflow. — *#fix(hotkey)*

### Changed

- **`README.md`** — added a Multi-monitor placement subsection, surfaced the JSON-import feature, refreshed the repo layout to include `macos/` and the new docs, bumped test counts (24 frontend, 33 Rust).
- **`.gitignore`** — ignore `.claude/` (per-machine agent session state).

### Known issues

- The macOS DMG bundling step (`bundle_dmg.sh`) occasionally fails on busy disks (FileVault background indexing, Time Machine snapshot in progress). The `.app` itself is built first and is unaffected — see [`macos/README.md` § Troubleshooting](./macos/README.md#troubleshooting).
- macOS builds are **arm64 only** (Apple Silicon). Intel-Mac users need to build from source with `--target x86_64-apple-darwin`.
- Bundles are **not Apple-signed** — Gatekeeper will refuse to open on first launch. Workarounds documented in `macos/README.md`.

## [0.2.0] — 2026-04-24

### Added

- **macOS bundle shell** under [`macos/`](./macos) — DMG + `.app` targets, `entitlements.plist`, capabilities, thin `main.rs` reusing `clipsnap-core`.
- **Text expander** ("snippets") — abbreviations (e.g. `mfg`) with optional title and body. Matching snippets appear at the top of the History list when you type their abbreviation; Enter pastes the body. Dedicated **Snippets** tab for create/edit/delete, **Manage Snippets** entry in the tray menu.
- **GitHub Actions CI** — Rust + frontend tests on every push/PR ([`ci.yml`](./.github/workflows/ci.yml)).
- **GitHub Actions release** — builds Windows MSI/EXE and publishes a GitHub Release on `v*` tags ([`release.yml`](./.github/workflows/release.yml)).
- **Frontend unit tests** — vitest + happy-dom + @testing-library/react (`Footer`, `format` helpers — 24 tests).
- **Rust unit tests** — in-memory SQLite tests for `db` (insert/dedupe/list/touch/prune — 27 tests).
- README badges, icon header, polished layout.

### Known issues (resolved in 0.2.1)

- macOS build broken (`macos-private-api` cargo feature missing, `set_activation_policy` type mismatch). Fixed in 0.2.1.
- CI failing due to stale `pnpm-lock.yaml`. Fixed in 0.2.1.

## [0.1.0] — 2026-04-23

### Added

- Initial release. Windows-first clipboard history manager.
- Global hotkey `Ctrl+Shift+V` opens a frameless, always-on-top popup centered on the cursor's monitor.
- Captures **text**, **RTF**, **HTML**, **images** (≤ 5 MB, base64 PNG), and **file lists** via real OS clipboard change events (no polling).
- Fuzzy search (`fuse.js`, threshold 0.4) over preview text.
- Auto-paste with `enigo` (simulates `Ctrl+V` after the popup hides).
- SQLite history at `%APPDATA%\ClipSnap\history.db`, deduped on SHA-256, capped at 1 000 entries.
- System tray menu: Open · Pause Capture · Clear History · Start with Windows · Quit.
- pnpm + Cargo workspaces with shared [`core/`](./core) and [`win/`](./win) bundle shell.

[0.2.3]: https://github.com/pepperonas/clipsnap/releases/tag/v0.2.3
[0.2.2]: https://github.com/pepperonas/clipsnap/releases/tag/v0.2.2
[0.2.1]: https://github.com/pepperonas/clipsnap/releases/tag/v0.2.1
[0.2.0]: https://github.com/pepperonas/clipsnap/releases/tag/v0.2.0
[0.1.0]: https://github.com/pepperonas/clipsnap/commits/main
