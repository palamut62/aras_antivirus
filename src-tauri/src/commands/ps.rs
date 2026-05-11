use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct PsResult {
    pub success: bool,
    pub data: Option<Value>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn run_ps(
    _app: tauri::AppHandle,
    script: String,
    args: Vec<String>,
    task_id: Option<String>,
) -> Result<PsResult, String> {
    let _ = task_id;
    // Run on a blocking thread to keep stdin/stdout pipe sync work off the async runtime.
    tokio::task::spawn_blocking(move || crate::services::ps_host::run(&script, &args))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn cancel_task(task_id: String) -> bool {
    let _ = task_id;
    // With persistent host, individual task cancel is non-trivial. Future: implement via
    // dedicated cancel channel + per-task PID tracking. For now no-op.
    false
}
