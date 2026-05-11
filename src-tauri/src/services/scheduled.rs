use serde_json::json;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static LAST_RUN: AtomicU64 = AtomicU64::new(0);

#[allow(dead_code)]
pub fn last_run_ts() -> u64 { LAST_RUN.load(Ordering::Relaxed) }

pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            let settings = crate::services::settings::get();
            let enabled = settings.get("scheduledScan").and_then(|v| v.as_bool()).unwrap_or(false);
            let hours = settings.get("scheduledScanHours").and_then(|v| v.as_u64()).unwrap_or(24);
            let interval_secs = hours.max(1) * 3600;

            if enabled {
                let now = chrono::Utc::now().timestamp() as u64;
                let last = LAST_RUN.load(Ordering::Relaxed);
                if last == 0 || now.saturating_sub(last) >= interval_secs {
                    crate::services::activity::push("info", "Scheduled scan triggered");
                    LAST_RUN.store(now, Ordering::Relaxed);
                    let _ = app.emit("banner:notify", json!({
                        "type": "info",
                        "title": "Zamanlanmış tarama başlıyor",
                        "action": { "label": "Aç", "route": "/security-scan" }
                    }));
                    let _ = app.emit("scheduled-scan:start", json!({ "ts": now }));
                }
            }
            std::thread::sleep(Duration::from_secs(60));
        }
    });
}
