//! Cross-platform "talk to the focused text field directly" abstraction.
//!
//! The text-expander has two operations to perform when the hotkey fires:
//!   1. read the word immediately before the cursor in the focused field
//!   2. replace that word with the snippet body
//!
//! The naive way to do both is keystroke synthesis (`Cmd/Ctrl+Shift+←` to
//! select, `Cmd/Ctrl+C` to copy, `Cmd/Ctrl+V` to paste) — what this crate
//! used through v0.2.x. That works in apps that respect the standard
//! word-select shortcut, but breaks in:
//!
//!   * terminals (iTerm2, kitty, gnome-terminal — they intercept
//!     `Cmd/Ctrl+Shift+←` for pane navigation or marker selection)
//!   * web apps with custom keyboard handlers (Google Docs, online IDEs)
//!   * password fields (which refuse synthetic paste)
//!
//! And it always carries the cost of clobbering the user's clipboard
//! (we save & restore, but races exist), plus a visible selection flicker.
//!
//! The reliable alternative is to ask the OS's accessibility layer
//! directly: `AXUIElement` on macOS, `IUIAutomation` on Windows. Those
//! APIs are how every screen reader and accessibility tool inspects and
//! mutates focused UI — they're widely supported, well-maintained, and
//! don't go through synthesised keystrokes at all.
//!
//! [`FieldAccess::try_replace_word_before_cursor`] returns `Ok(true)` when
//! it successfully read & replaced the word in-place, `Ok(false)` when
//! the focused element didn't expose the necessary AX/UIA attributes
//! (caller falls back to the keystroke path), and `Err` for actual
//! failures (permission denied, OS error, …).

use anyhow::Result;

/// Accessibility-layer access to the focused text field. Implemented per
/// platform via raw FFI to the native API:
/// - macOS: `AXUIElement` (ApplicationServices).
/// - Windows: `IUIAutomation` (UIAutomationCore).
/// - Linux / others: a no-op stub returning "not supported".
pub trait FieldAccess {
    /// Read the focused field's value and the cursor position, then
    /// return the word immediately before the cursor (whitespace-bounded).
    /// Returns `None` if the focused element doesn't expose value /
    /// selected-range attributes (e.g. native Carbon, Java/Swing without
    /// AccessBridge), or if the cursor isn't in a text field at all.
    fn read_word_before_cursor(&self) -> Result<Option<String>>;

    /// Replace the word immediately before the cursor with `replacement`.
    /// Returns:
    /// - `Ok(true)` — replaced in-place via the accessibility API. Caller
    ///   does not need to fall back to keystroke synthesis.
    /// - `Ok(false)` — the focused element doesn't support setting
    ///   selected text. Caller should fall back.
    /// - `Err(_)` — actual error (e.g. AX permission revoked mid-call).
    fn try_replace_word_before_cursor(&self, replacement: &str) -> Result<bool>;
}

/// What `try_inplace_capture_and_replace` actually did. Surfaced via the
/// Diagnose UI so the user can see whether their app exposes proper
/// accessibility info or whether we had to fall back to the keystroke
/// path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)] // Variants are platform-specific — the Windows variant
                   // is "dead" on macOS builds and vice versa.
pub enum CapturePath {
    /// macOS AX (AXUIElement) succeeded.
    Ax,
    /// Windows UI Automation succeeded.
    Uia,
    /// Both AX/UIA returned None — fell back to the clipboard roundtrip.
    Clipboard,
}

/// Construct the platform-default field-access implementation.
pub fn default_field_access() -> Box<dyn FieldAccess + Send + Sync> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::AxFieldAccess)
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::UiaFieldAccess)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Box::new(stub::StubFieldAccess)
    }
}

/// Native-platform name used in user-facing strings ("AX" / "UIA").
pub fn native_path() -> CapturePath {
    #[cfg(target_os = "macos")]
    {
        CapturePath::Ax
    }
    #[cfg(target_os = "windows")]
    {
        CapturePath::Uia
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        CapturePath::Clipboard
    }
}

/// Find the start index of the "word" ending at `cursor` inside `text`.
/// Whitespace-bounded. UTF-8 safe — `cursor` and the returned index are
/// byte offsets, but they always land on character boundaries because
/// we only step over chars, not bytes.
pub(crate) fn word_start_before_cursor(text: &str, cursor_chars: usize) -> usize {
    // We work in *char* indices because AX & UIA both report cursor
    // positions in UTF-16 code units on macOS / 16-bit chars on
    // Windows — the FFI shims are responsible for converting to char
    // indices before calling here.
    let chars: Vec<(usize, char)> = text.char_indices().collect();
    let cursor_clamped = cursor_chars.min(chars.len());
    let mut start = cursor_clamped;
    while start > 0 {
        let (_, c) = chars[start - 1];
        if c.is_whitespace() {
            break;
        }
        start -= 1;
    }
    if start >= chars.len() {
        text.len()
    } else {
        chars[start].0
    }
}

/// Whitespace-trim a captured candidate, the same way the keystroke-path
/// expander does (handles trailing space, NBSP, CR/LF) so the snippet
/// lookup keys match.
pub(crate) fn trim_word(raw: &str) -> &str {
    raw.trim_matches(|c: char| c.is_whitespace() || c == '\u{00A0}')
}

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub mod stub {
    use super::*;

    pub struct StubFieldAccess;

    impl FieldAccess for StubFieldAccess {
        fn read_word_before_cursor(&self) -> Result<Option<String>> {
            Ok(None)
        }
        fn try_replace_word_before_cursor(&self, _replacement: &str) -> Result<bool> {
            Ok(false)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn word_start_simple() {
        // "hello world|" — cursor at end. Word start = position of "w".
        let text = "hello world";
        let start = word_start_before_cursor(text, text.chars().count());
        assert_eq!(start, "hello ".len());
        assert_eq!(&text[start..], "world");
    }

    #[test]
    fn word_start_at_end_of_first_word() {
        // "hello| world" — cursor right after first word, before space.
        let text = "hello world";
        let start = word_start_before_cursor(text, "hello".chars().count());
        assert_eq!(start, 0);
        assert_eq!(&text[start.."hello".len()], "hello");
    }

    #[test]
    fn word_start_inside_a_word() {
        // "abbr|foo" — cursor is between "abbr" and "foo".
        let text = "abbrfoo";
        let start = word_start_before_cursor(text, "abbr".chars().count());
        assert_eq!(start, 0);
    }

    #[test]
    fn word_start_only_whitespace_before_cursor() {
        let text = "   ";
        let start = word_start_before_cursor(text, 3);
        assert_eq!(start, 3);
    }

    #[test]
    fn word_start_unicode() {
        // German umlauts are multi-byte in UTF-8 but single chars.
        let text = "Größe Größe";
        let total_chars = text.chars().count();
        let start = word_start_before_cursor(text, total_chars);
        assert_eq!(&text[start..], "Größe");
    }

    #[test]
    fn word_start_handles_cursor_past_end() {
        let text = "abc";
        let start = word_start_before_cursor(text, 999);
        // Cursor clamps to end → word "abc".
        assert_eq!(start, 0);
    }

    #[test]
    fn trim_word_handles_nbsp_and_newlines() {
        assert_eq!(trim_word("\u{00A0}mfg "), "mfg");
        assert_eq!(trim_word("mfg\n"), "mfg");
        assert_eq!(trim_word("   "), "");
    }
}
