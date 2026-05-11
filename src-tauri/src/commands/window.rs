use tauri::Manager;

#[tauri::command]
pub fn window_minimize(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") { let _ = w.minimize(); }
}

#[tauri::command]
pub fn window_maximize(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_maximized().unwrap_or(false) { let _ = w.unmaximize(); }
        else { let _ = w.maximize(); }
    }
}

#[tauri::command]
pub fn window_close(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        // Hide to tray instead of closing
        let _ = w.hide();
    }
}
