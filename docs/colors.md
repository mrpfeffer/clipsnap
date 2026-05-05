# Hex colors — inline preview + picker

Two small but useful tools that landed in **v0.4.0**.

## Inline hex preview

Type a hex color in the search input and ClipSnap surfaces a color row at the top of the list — same pattern as the inline calculator.

| You type            | Result                                              |
|---------------------|-----------------------------------------------------|
| `#3366FF`           | Color row, canonical `#3366FF`                      |
| `3366ff`            | Color row, normalised to `#3366FF` (uppercase)      |
| `#abc`              | Expanded to `#AABBCC`                               |
| `#abcd`             | 4-digit RGBA short form, alpha = 0xDD/0xFF          |
| `#3366FF80`         | 8-digit RGBA, alpha ≈ 0.50                          |
| `abc` *(no hash)*   | **Rejected** — too ambiguous with search input      |
| `f00d` *(no hash)*  | **Rejected**                                        |
| `#xyzabc`           | Rejected (non-hex chars)                            |

**Activation.** Press <kbd>Enter</kbd> on a color row → ClipSnap pastes the **canonical** `#RRGGBB` (or `#RRGGBBAA` if alpha < 1), uppercase, into the previously focused app.

**Preview pane** for a selected color row:

- Big 128 px swatch with the hex overlaid, foreground auto-picked black or white via WCAG relative-luminance for readability.
- Three rows below: `Hex`, `RGB`, `HSL` — each with a copy-to-clipboard button.

**Implementation.** All of this is pure frontend in [`core/frontend/src/lib/colors.ts`](../core/frontend/src/lib/colors.ts). 24 vitest cases cover valid / invalid input, canonical formatting, RGB ↔ HSL conversion, and the WCAG-based foreground picker.

## OS-native color picker

The History tab's toolbar gains a **Color picker** button (palette icon, next to the clip count). Click it → ClipSnap fires a hidden `<input type="color">`, which Tauri renders via the OS-native dialog:

| OS      | Picker                                  |
|---------|-----------------------------------------|
| macOS   | NSColorPanel (the standard system color picker) |
| Windows | Win32 `ChooseColor` dialog              |
| Linux   | GTK ColorChooser (X11) / portal (Wayland) |

The chosen color is written to the system clipboard (uppercase `#RRGGBB`) via the Web Clipboard API. The clipboard watcher picks it up on the next OS event tick and adds a new clip to the History tab — same as if you'd copied the value from any other app.

This is a deliberately minimal v1 — no in-app HSL sliders, no eyedropper-from-screen. The OS pickers are well-localised, accessible, and consistent with whatever the user is used to.

## See also

- [`core/frontend/src/lib/calc.ts`](../core/frontend/src/lib/calc.ts) — the sibling inline calculator. Same Alfred-inspired pattern.
- [`docs/text-expander.md`](./text-expander.md) — the other „triggered by typing" feature.
