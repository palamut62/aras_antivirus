use serde_json::Value;

#[tauri::command]
pub fn activity_recent(n: Option<usize>) -> Vec<crate::services::activity::ActivityEntry> {
    crate::services::activity::recent(n.unwrap_or(20))
}

#[tauri::command]
pub fn guard_control(action: String) -> Value {
    // start/stop currently always-on; "status" returns active
    serde_json::json!({ "success": true, "data": { "running": true, "action": action } })
}

#[tauri::command]
pub async fn autostart_set(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())?;
    } else {
        manager.disable().map_err(|e| e.to_string())?;
    }
    manager.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn autostart_is_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}
