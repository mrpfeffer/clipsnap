use std::sync::atomic::AtomicBool;
use std::sync::Arc;

/// UI-side flags shared between Tauri commands and the popup window-event
/// handler. Currently only carries `suppress_hide`, which the frontend toggles
/// while a modal child window (e.g., the native file-open dialog) owns focus,
/// so the popup's "hide on blur" behaviour doesn't tear the popup down while
/// the user is still picking a file.
#[derive(Default)]
pub struct UiState {
    pub suppress_hide: Arc<AtomicBool>,
}
