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

**Latest release:** [![Latest Release](https://img.shields.io/github/v/release/pepperonas/clipsnap?style=flat-square&label=latest&color=green)](https://github.com/pepperonas/clipsnap/releases/latest) — see the [CHANGELOG](./CHANGELOG.md) for what's new.

| Platform | File | Notes |
|----------|------|-------|
| **Windows 11 / 10** | [`ClipSnap_<ver>_x64_en-US.msi`](https://github.com/pepperonas/clipsnap/releases/latest) | MSI installer — adds Start-menu entry & uninstaller |
| **Windows 11 / 10** | [`clipsnap.exe`](https://github.com/pepperonas/clipsnap/releases/latest) | Standalone exe — no install needed |
| **macOS 10.15+ (Apple Silicon)** | [`ClipSnap_<ver>_aarch64.dmg`](https://github.com/pepperonas/clipsnap/releases/latest) | DMG for arm64 Macs |
| **macOS Intel** | — | Build from source: [`macos/README.md`](./macos/README.md) |
| **Linux** | — | Planned for a later release |

> **macOS Gatekeeper note.** Local-build releases are **not Apple-signed**. On first launch macOS will refuse to open the app — right-click → **Open** → confirm, or **System Settings → Privacy & Security → "Open Anyway"**. Then grant **Accessibility** access (for paste). Full setup in [`macos/README.md`](./macos/README.md).

---

## Platform support

| Platform   | Status                  | Location                |
|------------|-------------------------|-------------------------|
| Windows 11 | ✅ implemented (v0.2.1) | [`win/`](./win)         |
| macOS      | ✅ implemented (v0.2.1) | [`macos/`](./macos)     |
| Linux      | 🟡 planned              | `linux/` (not yet)      |

All app logic lives in [`core/`](./core) — a single frontend (`core/frontend`) and a single Rust lib (`core/rust-lib`) shared across platforms. Each OS has its own thin bundle shell that owns platform-specific details (installer config, icons, capabilities). To add a new platform, see [`CONTRIBUTING.md`](./CONTRIBUTING.md#adding-a-new-platform-shell-linux-etc).

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
- **JSON import** — bulk-load snippets from a `.json` file via **Snippets → Import**, which opens the native file picker. Existing abbreviations are upserted (re-import is idempotent). Format reference in [`docs/snippets-import.md`](./docs/snippets-import.md); ready-to-import themed samples (signatures, dev boilerplates, markdown templates, …) under [`docs/examples/snippets/`](./docs/examples/snippets/).
- **Tray shortcut** — the system tray menu includes a **Manage Snippets** item that opens the popup directly on the Snippets tab.

### Multi-monitor placement
The popup opens on the monitor that contains the mouse cursor at hotkey time, horizontally centered and ~⅓ from the top. Placement is **clamped** to the active monitor's bounds, so the window never extends past a screen edge — important for mixed-DPI setups (e.g., MacBook Retina + external display). Implementation in [`core/rust-lib/src/hotkey.rs`](./core/rust-lib/src/hotkey.rs).

### System Tray
Menu items: Open · Manage Snippets · Pause Capture · Clear History · Start with Windows / Start at Login · Quit.

## Repository layout

```
clipsnap/
├── core/
│   ├── frontend/            # React 19 + TS + Tailwind v4 (cross-platform)
│   └── rust-lib/            # Shared Rust app logic (clipboard, db, hotkey, paste, tray, snippets)
├── win/                     # Windows-specific bundle shell
│   ├── README.md            # Windows install & build details
│   ├── package.json         # Tauri CLI entry
│   └── src-tauri/           # main.rs, Cargo.toml, tauri.conf.json, capabilities/, icons/
├── macos/                   # macOS-specific bundle shell
│   ├── README.md            # macOS install, Gatekeeper, Accessibility, troubleshooting
│   ├── package.json
│   └── src-tauri/           # entitlements.plist, tauri.conf.json (dmg+app), capabilities/
├── .github/
│   └── workflows/
│       ├── ci.yml           # Rust + frontend tests on every push/PR
│       └── release.yml      # Builds bundles and publishes GitHub Release on v* tags
├── docs/
│   ├── spec.md              # Original product specification
│   ├── snippets-import.md   # JSON snippet import — schema, semantics, examples
│   ├── RELEASING.md         # Release procedure
│   └── examples/
│       └── snippets/        # 5 themed JSON examples + their own README
├── scripts/
│   └── check.sh             # cargo clippy + tsc + eslint
├── Cargo.toml               # Rust workspace (members: core/rust-lib, win/src-tauri, macos/src-tauri)
├── pnpm-workspace.yaml      # pnpm workspace (core/frontend, win, macos)
└── package.json             # Root scripts (dev:win, build:win, dev:macos, build:macos, lint, typecheck, test)
```

## Quick start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Rust](https://rustup.rs/) | stable | MSVC toolchain on Windows; run `rustup component add clippy` |
| [Node.js](https://nodejs.org/) | 20+ | |
| [pnpm](https://pnpm.io/) | 10+ | `npm install -g pnpm` |

Platform-specific prerequisites:
- **Windows** → [`win/README.md`](./win/README.md) (WiX, MSVC build tools, WebView2)
- **macOS** → [`macos/README.md`](./macos/README.md) (Xcode CLT, Gatekeeper, Accessibility permission)

### Install & run

```bash
pnpm install          # install the whole workspace (CI uses --frozen-lockfile)

# Windows
pnpm dev:win          # tauri dev — live-reload
pnpm build:win        # → target/release/bundle/msi/ClipSnap_x.x.x_x64_en-US.msi

# macOS
pnpm dev:macos        # tauri dev — live-reload
pnpm build:macos      # → target/release/bundle/{macos/ClipSnap.app, dmg/ClipSnap_x.x.x_<arch>.dmg}
```

> Each platform must be built on its native host (Windows for MSI, macOS for DMG/`.app`). Cross-compilation is not supported.

### Snippet import

In ClipSnap: open the popup (`Ctrl+Shift+V`) → **Snippets** tab → **Import** → pick a `.json` file. The native file picker opens (NSOpenPanel on macOS, OpenFileDialog on Windows); existing abbreviations are upserted in place so re-importing the same file is idempotent.

**Ready-to-import samples** in [`docs/examples/snippets/`](./docs/examples/snippets/):

| File | Snippets | Theme |
|------|----------|-------|
| [`getting-started.json`](./docs/examples/snippets/getting-started.json) | 3 | Address, email, German signature — first-import test |
| [`signatures.json`](./docs/examples/snippets/signatures.json) | 4 | Email signatures (DE/EN, short, OOO template) |
| [`dev.json`](./docs/examples/snippets/dev.json) | 8 | Shebang, MIT header, fn skeletons, gitignore, commit-msg |
| [`markdown.json`](./docs/examples/snippets/markdown.json) | 5 | Headings, table, `<details>`, PR-body |
| [`wrapped-form.json`](./docs/examples/snippets/wrapped-form.json) | 2 | Demonstrates `{ "snippets": [...] }` shape |

See [`docs/snippets-import.md`](./docs/snippets-import.md) for the full schema, field semantics, the sqlite3+jq export recipe, and tips/anti-patterns.

### Tests

```bash
pnpm test             # frontend unit tests (vitest + happy-dom) — 24 tests
cargo test --workspace  # Rust unit tests — 33 tests (db, snippets/import)
```

The same commands run in [GitHub Actions CI](./.github/workflows/ci.yml) on every push and PR.

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

## Contributing

Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev workflow, code style, and how to add IPC commands or new platform shells.

## Releasing

Push a `v*` tag to trigger the [release workflow](https://github.com/pepperonas/clipsnap/actions/workflows/release.yml), which builds the Windows and macOS bundles and attaches them to a GitHub Release. Full procedure (version bumps, pre-flight checks, troubleshooting) in [`docs/RELEASING.md`](./docs/RELEASING.md).

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) — every release is documented with what was added, fixed, and any known issues at the time.

## License

[MIT](./LICENSE) — © 2026 Martin Pfeffer | [celox.io](https://celox.io)
