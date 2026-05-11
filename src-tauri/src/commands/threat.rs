use serde_json::Value;

#[tauri::command]
pub fn threat_add(entry: Value) -> Value {
    crate::services::sqlite::threat_insert(entry).unwrap_or(serde_json::json!({}))
}

#[tauri::command]
pub fn threat_list(limit: Option<usize>, offset: Option<usize>) -> Vec<Value> {
    crate::services::sqlite::threat_list(limit.unwrap_or(100), offset.unwrap_or(0))
}

#[tauri::command]
pub fn threat_search(query: String) -> Vec<Value> {
    crate::services::sqlite::threat_search(&query)
}

#[tauri::command]
pub fn threat_stats() -> Value { crate::services::sqlite::threat_stats() }

#[tauri::command]
pub fn threat_by_type(r#type: String) -> Vec<Value> {
    crate::services::sqlite::threat_by_type(&r#type)
}

#[tauri::command]
pub fn threat_update_action(id: String, action: String) -> Value {
    crate::services::sqlite::threat_update_action(&id, &action)
}

#[tauri::command]
pub fn threat_delete(id: String) { crate::services::sqlite::threat_delete(&id) }
