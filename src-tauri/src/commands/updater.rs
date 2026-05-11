use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub current_version: String,
    pub notes: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(u)) => Ok(UpdateInfo {
            available: true,
            version: Some(u.version.clone()),
            current_version: current,
            notes: u.body.clone(),
            date: u.date.map(|d| d.to_string()),
        }),
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            current_version: current,
            notes: None,
            date: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No update available".to_string())?;
    let mut total: u64 = 0;
    update.download_and_install(
        |chunk, content_length| {
            total += chunk as u64;
            let _ = content_length;
            log::info!("updater: downloaded {} bytes", total);
        },
        || {
            log::info!("updater: download finished, installing");
        }
    ).await.map_err(|e| e.to_string())?;
    Ok(())
}
