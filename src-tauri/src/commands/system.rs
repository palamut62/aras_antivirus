use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Mutex;
use sysinfo::System;

static SYS: Lazy<Mutex<System>> = Lazy::new(|| {
    let mut s = System::new();
    s.refresh_all();
    Mutex::new(s)
});

#[derive(Serialize)]
pub struct MemoryUsage {
    pub used: u64,
    pub total: u64,
    pub percent: f32,
}

#[derive(Serialize)]
pub struct ResourceUsage {
    pub cpu: f32,
    pub memory: MemoryUsage,
}

#[tauri::command]
pub fn resource_usage() -> ResourceUsage {
    let mut s = SYS.lock().unwrap();
    s.refresh_cpu_usage();
    s.refresh_memory();
    let cpu = s.global_cpu_usage();
    let total = s.total_memory();
    let used = s.used_memory();
    let percent = if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 };
    ResourceUsage { cpu, memory: MemoryUsage { used, total, percent } }
}

#[tauri::command]
pub fn user_paths() -> Value {
    let home = dirs::home_dir().map(|p| p.display().to_string()).unwrap_or_else(|| "C:\\Users\\User".into());
    let downloads = dirs::download_dir().map(|p| p.display().to_string()).unwrap_or_else(|| format!("{}\\Downloads", home));
    let desktop = dirs::desktop_dir().map(|p| p.display().to_string()).unwrap_or_else(|| format!("{}\\Desktop", home));
    let temp = std::env::temp_dir().display().to_string();
    json!({ "home": home, "downloads": downloads, "desktop": desktop, "temp": temp })
}
