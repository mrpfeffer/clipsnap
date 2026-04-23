#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clipsnap_core::run(tauri::generate_context!());
}
