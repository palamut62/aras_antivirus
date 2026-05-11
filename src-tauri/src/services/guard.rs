use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebouncedEvent, DebouncedEventKind};
use serde_json::json;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

fn watched_paths() -> Vec<PathBuf> {
    let mut out = vec![];
    if let Some(h) = dirs::home_dir() {
        for name in &["Downloads", "Desktop", "Documents", "Pictures"] {
            let p = h.join(name);
            if p.exists() {
                out.push(p);
            }
        }
    }
    let temp = std::env::temp_dir();
    if temp.exists() {
        out.push(temp);
    }
    out
}

fn is_executable(path: &std::path::Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        matches!(
            ext.to_ascii_lowercase().as_str(),
            "exe" | "msi" | "msix" | "scr" | "bat" | "cmd" | "ps1" | "js" | "vbs" | "jar" | "lnk"
        )
    } else {
        false
    }
}

fn is_known_powershell_policy_probe(path: &std::path::Path) -> bool {
    let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
        return false;
    };
    name.to_ascii_lowercase().starts_with("__psscriptpolicytest_")
}

pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        let (tx, rx) = channel::<notify_debouncer_mini::DebounceEventResult>();
        let mut recent_hits: HashMap<String, Instant> = HashMap::new();
        let dedup_window = Duration::from_secs(20);

        let mut debouncer = match new_debouncer(Duration::from_secs(2), tx) {
            Ok(d) => d,
            Err(e) => {
                log::error!("guard: debouncer init failed: {e}");
                return;
            }
        };

        let paths = watched_paths();
        for p in &paths {
            if let Err(e) = debouncer.watcher().watch(p, RecursiveMode::NonRecursive) {
                log::warn!("guard: watch {} failed: {e}", p.display());
            }
        }

        crate::services::activity::push("info", format!("Guard active on {} paths", paths.len()));
        let _ = app.emit(
            "banner:notify",
            json!({
                "type": "info",
                "title": "Canli Koruma aktif",
                "message": format!("{} klasor izleniyor", paths.len())
            }),
        );

        for events in rx {
            let Ok(events) = events else { continue };
            recent_hits.retain(|_, seen_at| seen_at.elapsed() < dedup_window);

            for DebouncedEvent { path, kind } in events {
                if !matches!(kind, DebouncedEventKind::Any) {
                    continue;
                }
                if !is_executable(&path) {
                    continue;
                }
                if is_known_powershell_policy_probe(&path) {
                    continue;
                }

                let dedup_key = path.to_string_lossy().to_ascii_lowercase();
                if recent_hits.contains_key(&dedup_key) {
                    continue;
                }
                recent_hits.insert(dedup_key, Instant::now());

                let fname = path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("?")
                    .to_string();

                crate::services::activity::push("warn", format!("New exec: {fname}"));
                let _ = app.emit(
                    "banner:notify",
                    json!({
                        "type": "warning",
                        "title": "Yeni calistirilabilir dosya",
                        "message": fname.clone(),
                        "action": { "label": "Incele", "route": "/threats" }
                    }),
                );

                // Keep both key styles for compatibility during migration.
                let _ = crate::services::threat::add(json!({
                    "type": "new-executable",
                    "threatType": "unknown",
                    "path": path.display().to_string(),
                    "filePath": path.display().to_string(),
                    "name": fname.clone(),
                    "fileName": fname,
                    "severity": "low",
                    "action": "detected",
                    "source": "realtime",
                    "details": "Real-time guard: new executable/script file detected"
                }));
            }
        }
    });
}
