// Thin shim retained for code that called the old API.
// All storage is delegated to `sqlite`.

use serde_json::Value;

pub fn init(_app: tauri::AppHandle) -> anyhow::Result<()> { Ok(()) }

#[allow(dead_code)]
pub fn add(entry: Value) -> Value {
    crate::services::sqlite::history_insert(entry).unwrap_or(serde_json::json!({}))
}
