use serde_json::Value;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn settings_get() -> Value {
    crate::services::settings::get()
}

#[tauri::command]
pub fn settings_update(app: tauri::AppHandle, partial: Value) -> Value {
    let updated = crate::services::settings::update(partial.clone());

    // Sync autostart if changed
    if partial.get("autoStart").is_some() {
        let want = updated.get("autoStart").and_then(|v| v.as_bool()).unwrap_or(false);
        let mgr = app.autolaunch();
        if let Ok(cur) = mgr.is_enabled() {
            if want && !cur { let _ = mgr.enable(); }
            if !want && cur { let _ = mgr.disable(); }
        }
    }

    // Rebuild tray if protection/scheduled toggled
    if partial.get("liveProtection").is_some() || partial.get("scheduledScan").is_some() {
        let _ = crate::services::tray::rebuild(&app);
    }

    // Update env for PS scripts (VirusTotal key)
    if let Some(key) = partial.get("virusTotalApiKey").and_then(|v| v.as_str()) {
        std::env::set_var("VIRUSTOTAL_API_KEY", key);
    }

    updated
}
