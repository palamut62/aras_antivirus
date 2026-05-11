use std::path::PathBuf;
use tauri::Manager;

pub fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| {
        dirs::data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join("aras-antivirus")
    })
}

pub fn ps_scripts_dir(app: &tauri::AppHandle) -> PathBuf {
    // In dev, scripts are at <project>/backend/ps relative to src-tauri.
    // In production, we bundle them alongside the exe via resources or fallback to relative.
    let resource_dir = app.path().resource_dir().ok();
    if let Some(rd) = resource_dir {
        let candidate = rd.join("backend").join("ps");
        if candidate.exists() {
            return candidate;
        }
    }
    // Dev: cargo runs from src-tauri/
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let dev_path = cwd.join("..").join("backend").join("ps");
    if dev_path.exists() {
        return dev_path;
    }
    cwd.join("backend").join("ps")
}
