use serde_json::Value;

#[tauri::command]
pub fn quarantine_isolate(app: tauri::AppHandle, file_path: String) -> Result<Value, String> {
    crate::services::quarantine::isolate(&app, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quarantine_restore(app: tauri::AppHandle, id: String, dest: Option<String>) -> Result<Value, String> {
    crate::services::quarantine::restore(&app, &id, dest.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quarantine_purge(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    crate::services::quarantine::purge(&app, &id).map_err(|e| e.to_string())
}
