use serde_json::{json, Value};

#[tauri::command]
pub async fn yara_scan(target: String, max_file_mb: Option<u64>) -> Result<Value, String> {
    let max_mb = max_file_mb.unwrap_or(50);
    tokio::task::spawn_blocking(move || {
        crate::services::yara::scan_dir(&target, max_mb)
            .map(|r| serde_json::to_value(r).unwrap_or(json!({})))
            .map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn yara_reload(app: tauri::AppHandle) -> Result<usize, String> {
    crate::services::yara::reload(&app).map_err(|e| e.to_string())?;
    Ok(crate::services::yara::rule_count())
}

#[tauri::command]
pub fn yara_rule_count() -> usize {
    crate::services::yara::rule_count()
}
