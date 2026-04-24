<div align="center">
  <img src="win/src-tauri/icons/icon.png" alt="ClipSnap" width="120" />

  # ClipSnap

  **Fast, lightweight clipboard history manager + text expander for Windows 11**

  [![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)](https://github.com/pepperonas/clipsnap/releases)
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
  [![CI](https://img.shields.io/github/actions/workflow/status/pepperonas/clipsnap/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/pepperonas/clipsnap/actions/workflows/ci.yml)
  [![Latest Release](https://img.shields.io/github/v/release/pepperonas/clipsnap?style=flat-square&label=download)](https://github.com/pepperonas/clipsnap/releases/latest)

  Press `Ctrl+Shift+V` — search — paste. Inspired by Alfred's clipboard viewer on macOS.
</div>

---

## Download

Pre-built Windows binaries are attached to every [GitHub Release](https://github.com/pepperonas/clipsnap/releases/latest):

| File | Description |
|------|-------------|
| `ClipSnap_x.x.x_x64_en-US.msi` | Windows installer — adds start-menu entry and uninstaller |
| `clipsnap.exe` | Windows standalone executable — no installation needed |
| `ClipSnap_x.x.x_x64.dmg` | macOS disk image |

---

## Platform support

| Platform   | Status                | Location                |
|------------|-----------------------|-------------------------|
| Windows 11 | ✅ implemented (v0.2) | [`win/`](./win)         |
| macOS      | ✅ implemented (v0.2) | [`macos/`](./macos)     |
| Linux      | 🟡 planned            | `linux/` (not yet)      |

All app logic lives in [`core/`](./core) — a single frontend (`core/frontend`) and a single Rust lib (`core/rust-lib`) shared across platforms. Each OS has its own thin bundle shell that owns platform-specific details (installer config, icons, capabilities).

## Features (v0.2, Windows)

### Clipboard History
- **Global hotkey** `Ctrl+Shift+V` opens a frameless, always-on-top popup centered on the monitor with the cursor.
- **Clipboard capture** — text, RTF, HTML, images (≤ 5 MB, stored as base64 PNG), and file lists via real OS clipboard change events (no polling).
- **Fuzzy search** (`fuse.js`, threshold 0.4) as you type.
- **Virtualized list** with a preview panel per content type (text, image, HTML render, RTF, file list).
- **Auto-paste** — Enter pastes the selected entry into the previously focused app (`enigo` simulates `Ctrl+V`).
- **SQLite history** at `%APPDATA%\ClipSnap\history.db`, deduped on SHA-256, capped at 1 000 entries.

### Text Expander (new in v0.2)
- **Snippets** — store reusable text templates, each with a short abbreviation (e.g. `mfg`), an optional title, and a body.
- **Instant expansion** — type the abbreviation in the History search bar; matching snippets appear at the top of the list ranked above clipboard entries. Press Enter to paste the snippet body directly into the previously focused app.
- **Snippets tab** — dedicated management UI accessible via the **Snippets** tab button in the top-right of the popup. Create, edit, and delete snippets with a two-column form (abbreviation · title · body).
- **Tray shortcut** — the system tray menu includes a **Manage Snippets** item that opens the popup directly on the Snippets tab.

### System Tray
Menu items: Open · Manage Snippets · Pause Capture · Clear History · Start with Windows · Quit.

## Repository layout

```
clipsnap/
├── core/
│   ├── frontend/            # React 19 + TS + Tailwind v4 (cross-platform)
│   └── rust-lib/            # Shared Rust app logic (clipboard, db, hotkey, paste, tray, snippets)
├── win/                     # Windows-specific bundle shell
│   ├── package.json         # Tauri CLI entry
│   └── src-tauri/           # main.rs, Cargo.toml, tauri.conf.json, capabilities/, icons/
├── .github/
│   └── workflows/
│       ├── ci.yml           # Rust + frontend tests on every push/PR
│       └── release.yml      # Builds MSI + EXE and publishes GitHub Release on v* tags
├── docs/
│   └── spec.md              # Original product specification
├── scripts/
│   └── check.sh             # cargo clippy + tsc + eslint
├── Cargo.toml               # Rust workspace
├── pnpm-workspace.yaml      # pnpm workspace
└── package.json             # Root scripts (dev:win, build:win, lint, typecheck, test)
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

# Windows
pnpm dev:win          # tauri dev — live-reload
pnpm build:win        # → target/release/bundle/msi/ClipSnap_x.x.x_x64_en-US.msi

# macOS
pnpm dev:macos        # tauri dev — live-reload
pnpm build:macos      # → target/release/bundle/dmg/ClipSnap_x.x.x_x64.dmg
```

> Each platform must be built on its native host (Windows for MSI, macOS for DMG).

### Tests

```bash
pnpm test             # frontend unit tests (vitest + happy-dom)
cargo test --workspace  # Rust unit tests
```

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
| **macOS accessibility** | Paste simulation (`enigo`) requires Accessibility access. macOS will prompt on first use — grant it in System Preferences → Privacy & Security → Accessibility. |
| **macOS unsigned build** | Release builds are not notarized. macOS may warn "unidentified developer" — right-click the app and choose Open to bypass Gatekeeper on first launch. |

## Releasing a new version

1. Bump `version` in `Cargo.toml`, `win/src-tauri/tauri.conf.json`, and `package.json`.
2. Commit the changes.
3. Push a version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The [Release workflow](https://github.com/pepperonas/clipsnap/actions/workflows/release.yml) will build and publish automatically.

## License

[MIT](./LICENSE) — © 2026 Martin Pfeffer | [celox.io](https://celox.io)
