use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

#[derive(Deserialize)]
pub struct BannerPayload {
    pub r#type: String,
    pub title: String,
    pub message: Option<String>,
}

/// Emit an in-app banner. If the main window is hidden/minimized, also fire a native toast.
pub fn banner(app: &AppHandle, payload: serde_json::Value) {
    let _ = app.emit("banner:notify", payload.clone());

    let visible = app.get_webview_window("main")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    let minimized = app.get_webview_window("main")
        .and_then(|w| w.is_minimized().ok())
        .unwrap_or(false);

    if !visible || minimized {
        let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Aras Antivirus");
        let body = payload.get("message").and_then(|v| v.as_str()).unwrap_or("");
        let _ = app.notification().builder()
            .title(title)
            .body(body)
            .show();
    }
}
