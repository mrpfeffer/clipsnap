<div align="center">
  <img src="win/src-tauri/icons/icon.png" alt="ClipSnap" width="120" />

  # ClipSnap

  **Fast, lightweight clipboard history manager for Windows 11**

  [![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](https://github.com/pepperonas/clipsnap/releases)
  [![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows%2011-0078D4?style=flat-square&logo=windows11&logoColor=white)](./win)
  [![Tauri 2](https://img.shields.io/badge/Tauri-2-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
  [![Rust](https://img.shields.io/badge/Rust-stable-CE422B?style=flat-square&logo=rust&logoColor=white)](https://rustup.rs)
  [![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
  [![SQLite](https://img.shields.io/badge/SQLite-bundled-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
  [![Issues](https://img.shields.io/github/issues/pepperonas/clipsnap?style=flat-square)](https://github.com/pepperonas/clipsnap/issues)
  [![Stars](https://img.shields.io/github/stars/pepperonas/clipsnap?style=flat-square)](https://github.com/pepperonas/clipsnap/stargazers)

  Press `Ctrl+Shift+V` — search — paste. Inspired by Alfred's clipboard viewer on macOS.
</div>

---

## Platform support

| Platform   | Status                | Location                |
|------------|-----------------------|-------------------------|
| Windows 11 | ✅ implemented (v0.1) | [`win/`](./win)         |
| macOS      | 🟡 planned            | `macos/` (not yet)      |
| Linux      | 🟡 planned            | `linux/` (not yet)      |

All app logic lives in [`core/`](./core) — a single frontend (`core/frontend`) and a single Rust lib (`core/rust-lib`) shared across platforms. Each OS has its own thin bundle shell that owns platform-specific details (installer config, icons, capabilities).

## Features (v0.1, Windows)

- **Global hotkey** `Ctrl+Shift+V` opens a frameless, always-on-top popup centered on the monitor with the cursor.
- **Clipboard capture** — text, RTF, HTML, images (≤ 5 MB, stored as base64 PNG), and file lists via real OS clipboard change events (no polling).
- **Fuzzy search** (`fuse.js`, threshold 0.4) as you type.
- **Virtualized list** with a preview panel per content type.
- **Auto-paste** — Enter pastes the selected entry into the previously focused app (`enigo` simulates `Ctrl+V`).
- **SQLite history** at `%APPDATA%\ClipSnap\history.db`, deduped on SHA-256, capped at 1 000 entries.
- **System tray** menu: Open · Pause Capture · Clear History · Start with Windows · Quit.

## Repository layout

```
clipsnap/
├── core/
│   ├── frontend/            # React 19 + TS + Tailwind v4 (cross-platform)
│   └── rust-lib/            # Shared Rust app logic (clipboard, db, hotkey, paste, tray)
├── win/                     # Windows-specific bundle shell
│   ├── package.json         # Tauri CLI entry
│   └── src-tauri/           # main.rs, Cargo.toml, tauri.conf.json, capabilities/, icons/
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

| Tool | Version | Notes |
|------|---------|-------|
| [Rust](https://rustup.rs/) | stable | MSVC toolchain on Windows; run `rustup component add clippy` |
| [Node.js](https://nodejs.org/) | 20+ | |
| [pnpm](https://pnpm.io/) | 10+ | `npm install -g pnpm` |

Platform-specific prerequisites: **Windows** → [`win/README.md`](./win/README.md)

### Install & run (Windows)

```bash
pnpm install          # install the whole workspace
pnpm dev:win          # tauri dev — live-reload frontend + Rust
pnpm build:win        # produces target/release/bundle/msi/ClipSnap_x.x.x_x64_en-US.msi
```

> The `.msi` bundle must be produced on a Windows host. `pnpm dev:win` also runs on macOS / Linux for iterating on shared code.

### Static analysis

```bash
pnpm check            # cargo clippy (workspace) + tsc --noEmit + eslint
```

## Known limitations

| Limitation | Detail |
|------------|--------|
| **Unencrypted storage** | The SQLite history file is unencrypted — passwords and tokens you copy are visible to anyone with filesystem access to your profile. |
| **No sensitive-app detection** | ClipSnap captures everything without filtering. |
| **No cloud sync** | No sync, multi-device support, tagging, or favorites — explicitly out of scope for v1. |
| **File paste fallback** | Setting file-list clipboard payloads from Rust is not universally supported; ClipSnap falls back to pasting the newline-joined list of paths as text. |

## License

[MIT](./LICENSE) — © 2026 Martin Pfeffer | [celox.io](https://celox.io)
