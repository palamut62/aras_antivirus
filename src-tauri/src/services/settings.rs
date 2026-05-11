use once_cell::sync::OnceCell;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

static SETTINGS_PATH: OnceCell<PathBuf> = OnceCell::new();
static CACHE: OnceCell<Mutex<Value>> = OnceCell::new();

fn defaults() -> Value {
    json!({
        "liveProtection": true,
        "autoStart": false,
        "dryRunDefault": false,
        "sendToRecycleBin": true,
        "saveOperationLogs": true,
        "protectedPaths": [],
        "virusTotalApiKey": "",
        "scheduledScan": false,
        "scheduledScanInterval": "daily",
        "scheduledScanHours": 24,
        "theme": "dark",
        "language": "tr",
        "devFolders": []
    })
}

pub fn init(app: tauri::AppHandle) -> anyhow::Result<()> {
    let dir = crate::services::paths::app_data_dir(&app);
    fs::create_dir_all(&dir)?;
    let path = dir.join("settings.json");
    let value = if path.exists() {
        let raw = fs::read_to_string(&path)?;
        let mut v: Value = serde_json::from_str(&raw).unwrap_or_else(|_| defaults());
        // merge defaults for missing keys
        if let (Value::Object(ref mut existing), Value::Object(def)) = (&mut v, defaults()) {
            for (k, dv) in def {
                if !existing.contains_key(&k) {
                    existing.insert(k, dv);
                }
            }
        }
        v
    } else {
        let v = defaults();
        fs::write(&path, serde_json::to_string_pretty(&v)?)?;
        v
    };
    let _ = SETTINGS_PATH.set(path);
    let _ = CACHE.set(Mutex::new(value));
    Ok(())
}

pub fn get() -> Value {
    CACHE.get().map(|m| m.lock().unwrap().clone()).unwrap_or_else(defaults)
}

pub fn update(partial: Value) -> Value {
    if let Some(m) = CACHE.get() {
        let mut guard = m.lock().unwrap();
        if let (Value::Object(ref mut cur), Value::Object(p)) = (&mut *guard, partial) {
            for (k, v) in p {
                cur.insert(k, v);
            }
        }
        let snap = guard.clone();
        if let Some(path) = SETTINGS_PATH.get() {
            let _ = fs::write(path, serde_json::to_string_pretty(&snap).unwrap_or_default());
        }
        snap
    } else {
        defaults()
    }
}
