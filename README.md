# ClipSnap

A fast, lightweight clipboard history manager. Press a hotkey, search, paste — inspired by Alfred's clipboard viewer on macOS. Built with **Tauri 2**, **React 19 + TypeScript**, **Rust**, and **Tailwind CSS v4**.

## Platform support

| Platform  | Status              | Location                 |
|-----------|---------------------|--------------------------|
| Windows 11 | ✅ implemented (v0.1) | [`win/`](./win)         |
| macOS     | 🟡 planned           | `macos/` (not yet)       |
| Linux     | 🟡 planned           | `linux/` (not yet)       |

All app logic lives in [`core/`](./core) — a single frontend (`core/frontend`) and a single Rust lib (`core/rust-lib`) shared across platforms. Each OS has its own thin bundle shell that owns platform-specific details (installer config, icons, capabilities).

## Features (v0.1, Windows)

- Global hotkey `Ctrl+Shift+V` opens a frameless, always-on-top popup centered on the monitor with the cursor.
- Captures **text**, **RTF**, **HTML**, **images** (≤5 MB, stored as base64 PNG), and **file lists** — via real OS clipboard change events (no polling).
- Fuzzy search (`fuse.js`, threshold 0.4) as you type.
- Virtualized list with preview panel per content type.
- Enter auto-pastes the selected entry into the previously focused app (`enigo` simulates `Ctrl+V`).
- SQLite-backed history at `%APPDATA%\ClipSnap\history.db`, deduped on SHA-256, capped at 1000 entries.
- System tray menu: Open · Pause Capture · Clear History · Start with Windows · Quit.

## Repository layout

```
clipsnap/
├── core/
│   ├── frontend/            # React 19 + TS + Tailwind v4 (cross-platform)
│   └── rust-lib/            # Shared Rust app logic (clipboard, db, hotkey, paste, tray)
├── win/                     # Windows-specific bundle shell
│   ├── package.json         # Tauri CLI entry
│   └── src-tauri/           # main.rs, Cargo.toml (bin), tauri.conf.json, capabilities/, icons/
├── docs/
│   └── spec.md              # Original product specification
├── scripts/
│   └── check.sh             # cargo clippy + tsc + eslint
├── Cargo.toml               # Rust workspace
├── pnpm-workspace.yaml      # pnpm workspace
└── package.json             # Root scripts (dev:win, build:win, lint, typecheck)
```

## Quick start

### Prerequisites

- [Rust](https://rustup.rs/) stable (on Windows: MSVC toolchain) + `rustup component add clippy`
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+
- Platform-specific prerequisites — see the per-platform README:
  - **Windows** → [`win/README.md`](./win/README.md)

### Install & run (Windows)

```bash
pnpm install          # installs the whole workspace
pnpm dev:win          # tauri dev — live-reload frontend + Rust
pnpm build:win        # produces win/src-tauri/target/release/bundle/msi/*.msi
```

> Producing the `.msi` bundle must be done on a Windows host. Development (`pnpm dev:win`) also runs on macOS / Linux for iteration on the shared code.

### Static analysis

```bash
pnpm check            # cargo clippy (workspace) + tsc --noEmit + eslint
```

## Known limitations

- **Encryption at rest:** the SQLite history file is unencrypted. Treat it like a browser cache — passwords and tokens copied to the clipboard will be visible to anyone with filesystem access to your user profile.
- **No sensitive-app detection:** ClipSnap captures everything.
- **No cloud sync, multi-device, tagging, or favorites** — explicitly out of scope for v1.
- **File paste:** setting file-list clipboard payloads from Rust is not supported everywhere; when pasting a "files" entry, ClipSnap falls back to pasting the newline-joined list of paths as text.

## License

[MIT](./LICENSE) — © 2026 Martin Pfeffer | [celox.io](https://celox.io)
