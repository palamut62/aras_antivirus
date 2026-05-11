use std::time::Duration;
use tauri::AppHandle;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

pub fn start_updater(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(30));
            let _ = rebuild(&app);
        }
    });
}

pub fn rebuild(app: &AppHandle) -> tauri::Result<()> {
    let settings = crate::services::settings::get();
    let live = settings.get("liveProtection").and_then(|v| v.as_bool()).unwrap_or(true);
    let scheduled = settings.get("scheduledScan").and_then(|v| v.as_bool()).unwrap_or(false);

    let status_text = if live { "● Koruma: AÇIK" } else { "○ Koruma: KAPALI" };
    let sched_text = if scheduled { "⏱ Zamanlı: AÇIK" } else { "⏱ Zamanlı: KAPALI" };

    let status = MenuItem::with_id(app, "status", status_text, false, None::<&str>)?;
    let sched = MenuItem::with_id(app, "sched", sched_text, false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show", "Göster", true, None::<&str>)?;
    let scan = MenuItem::with_id(app, "scan", "Hızlı Tarama", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let mut items: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
        vec![&status, &sched, &sep1, &show, &scan, &sep2];

    let recent = crate::services::activity::recent(5);
    let mut recent_items: Vec<MenuItem<tauri::Wry>> = vec![];
    for (i, e) in recent.iter().enumerate() {
        let lbl = format!("[{}] {}", e.timestamp, truncate(&e.message, 40));
        recent_items.push(MenuItem::with_id(app, format!("act{i}"), lbl, false, None::<&str>)?);
    }
    for r in &recent_items { items.push(r); }

    let sep3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
    items.push(&sep3);
    items.push(&quit);

    let menu = Menu::with_items(app, &items)?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
        tray.set_tooltip(Some(format!("Aras Antivirus — {}", if live { "aktif" } else { "kapalı" })))?;
    }
    Ok(())
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max { s.to_string() }
    else { format!("{}…", s.chars().take(max).collect::<String>()) }
}
