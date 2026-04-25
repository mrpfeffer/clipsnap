# ClipSnap — macOS bundle

This directory contains the macOS-specific Tauri shell for ClipSnap. The shared app logic lives in [`../core`](../core); this shell only owns the bundle config (DMG / `.app`), entitlements, and a thin `main.rs` that boots the shared lib.

## Prerequisites (macOS)

- [Rust toolchain](https://rustup.rs/) (Apple Silicon: `aarch64-apple-darwin`; Intel: `x86_64-apple-darwin`) — with `clippy`: `rustup component add clippy`
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+
- **Xcode Command Line Tools** — `xcode-select --install`
- macOS 10.15 (Catalina) or newer

No DMG-specific tooling is required — Tauri's `bundle_dmg.sh` runs out of the box on macOS.

## Build

From the repository root:

```bash
pnpm install                                 # workspace install
pnpm dev:macos                               # tauri dev — live-reload
pnpm build:macos                             # produces .app + .dmg
```

Outputs:

```
target/release/bundle/macos/ClipSnap.app
target/release/bundle/dmg/ClipSnap_x.x.x_<arch>.dmg
```

If only the `.app` is needed (no DMG), build directly:

```bash
cd macos && pnpm tauri build --bundles app
```

## Install

Drag the `.app` from the DMG to `/Applications`, or copy directly:

```bash
cp -R target/release/bundle/macos/ClipSnap.app /Applications/
xattr -dr com.apple.quarantine /Applications/ClipSnap.app   # unsigned dev build
open /Applications/ClipSnap.app
```

### Gatekeeper (unsigned builds)

Local builds are not Apple-signed. On first launch macOS will refuse to open the app:

- **Right-click** → **Open** → confirm **Open** in the dialog, **or**
- **System Settings → Privacy & Security → "Open Anyway"** at the bottom.

The `xattr -dr com.apple.quarantine …` command above sidesteps this for development builds.

### Accessibility permission (required for paste)

Auto-paste uses synthesized `Cmd+V` keystrokes via [`enigo`](https://docs.rs/enigo). macOS will prompt for **Accessibility** access on first paste:

1. **System Settings → Privacy & Security → Accessibility**
2. Enable **ClipSnap**
3. **Quit and relaunch** ClipSnap (the permission only takes effect on the next process start)

Without Accessibility access the popup still opens and you can read entries, but `Enter` will not paste into the previous app.

## Usage

| Action         | Keys                       |
|----------------|----------------------------|
| Open popup     | `Ctrl` + `Shift` + `V`     |
| Navigate list  | `↑` / `↓`                  |
| Paste selected | `Enter` (or double-click)  |
| Close popup    | `Esc` (or click outside)   |

ClipSnap runs as a **menu-bar background app** — there is no Dock icon. The activation policy is set to `Accessory` on launch (see [`core/rust-lib/src/lib.rs`](../core/rust-lib/src/lib.rs)).

### Tray menu

- **Open (Ctrl+Shift+V)** — show the popup
- **Manage Snippets** — open popup directly on the Snippets tab
- **Pause Capture** — stop recording new clipboard items
- **Clear History…** — wipe all stored entries
- **Start at Login** — toggle macOS launch-agent registration
- **Quit ClipSnap**

## Data location

```
~/Library/Application Support/ClipSnap/history.db
```

SQLite database holding both clipboard history (capped at 1 000, deduped on SHA-256) and snippets.

## Files in this directory

```
macos/
├── package.json              # Tauri CLI entry + frontend proxy scripts
├── README.md                 # (this file)
└── src-tauri/
    ├── Cargo.toml            # bin crate; pulls in `tauri/macos-private-api`
    ├── build.rs              # tauri-build
    ├── tauri.conf.json       # bundle = ["dmg","app"], frontendDist = ../../core/frontend/dist
    ├── entitlements.plist    # macOS sandbox/entitlement declaration
    ├── capabilities/         # default + desktop capability permissions
    └── src/
        └── main.rs           # thin entrypoint: clipsnap_core::run(generate_context!())
```

## Multi-monitor placement

The popup opens on the monitor that contains the mouse cursor at hotkey time. The window is horizontally centered and placed roughly ⅓ from the top of the active monitor; placement is clamped to the monitor's bounds so the popup can never extend past a screen edge — important for mixed-DPI setups (e.g., MacBook Retina + external display). See `core/rust-lib/src/hotkey.rs::clamp_into_monitor`.

## Troubleshooting

- **App opens, hotkey does nothing.** Another app may already hold `Ctrl+Shift+V` (some launchers, IDEs). Close suspected conflicts and relaunch.
- **Popup opens but `Enter` does not paste.** Accessibility permission is missing — see "Accessibility permission" above. After granting, **quit and relaunch** ClipSnap.
- **`failed to bundle project … bundle_dmg.sh` during `pnpm build:macos`.** The DMG step occasionally fails on busy disks (FileVault background indexing, Time Machine snapshot, etc.). The `.app` itself is already built — install it directly with `cp -R target/release/bundle/macos/ClipSnap.app /Applications/`. Or rebuild only the `.app` with `pnpm tauri build --bundles app`.
- **Tray icon missing after launch.** macOS sometimes hides menu-bar icons when there's no room. Click and drag in the menu bar with `Cmd` held, or use [Bartender](https://www.macbartender.com/) / [Hidden Bar](https://github.com/dwarvesf/hidden) to pin it.
