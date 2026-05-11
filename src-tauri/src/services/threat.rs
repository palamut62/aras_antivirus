// Thin shim retained for code that called the old API (e.g. guard.rs).
// All storage is delegated to `sqlite`.

use serde_json::Value;

pub fn init(_app: tauri::AppHandle) -> anyhow::Result<()> { Ok(()) }

pub fn add(entry: Value) -> Value {
    crate::services::sqlite::threat_insert(entry).unwrap_or(serde_json::json!({}))
}

#[allow(dead_code)]
pub fn list(limit: usize, offset: usize) -> Vec<Value> {
    crate::services::sqlite::threat_list(limit, offset)
}
