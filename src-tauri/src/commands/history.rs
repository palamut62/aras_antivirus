use serde_json::Value;

#[tauri::command]
pub fn history_add(entry: Value) -> Value {
    crate::services::sqlite::history_insert(entry).unwrap_or(serde_json::json!({}))
}

#[tauri::command]
pub fn history_list(limit: Option<usize>, offset: Option<usize>) -> Vec<Value> {
    crate::services::sqlite::history_list(limit.unwrap_or(100), offset.unwrap_or(0))
}

#[tauri::command]
pub fn history_search(query: String) -> Vec<Value> {
    crate::services::sqlite::history_search(&query)
}

#[tauri::command]
pub fn history_stats() -> Value { crate::services::sqlite::history_stats() }

#[tauri::command]
pub fn history_by_action(action: String) -> Vec<Value> {
    crate::services::sqlite::history_by_action(&action)
}
