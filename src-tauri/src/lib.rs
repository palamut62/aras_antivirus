mod commands;
mod services;

use tauri::{Manager, Emitter};
use tauri::tray::TrayIconBuilder;
use tauri::menu::{Menu, MenuItem};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            services::settings::init(app.handle().clone())?;
            services::sqlite::init(&app.handle())?;
            services::history::init(app.handle().clone())?;
            services::threat::init(app.handle().clone())?;
            if let Err(e) = services::ps_host::init(&app.handle()) {
                log::error!("ps_host init failed: {e}");
            }
            if let Err(e) = services::yara::init(&app.handle()) {
                log::error!("yara init failed: {e}");
            }

            // System tray (initial)
            let show_i = MenuItem::with_id(app, "show", "Göster", true, None::<&str>)?;
            let scan_i = MenuItem::with_id(app, "scan", "Hızlı Tarama", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &scan_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Aras Antivirus")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus(); let _ = w.unminimize();
                        }
                    }
                    "scan" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                            let _ = w.emit("navigate", "/security-scan");
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up, ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Background services
            let handle = app.handle().clone();
            services::guard::start(handle.clone());
            services::scheduled::start(handle.clone());
            services::tray::start_updater(handle.clone());
            let _ = services::tray::rebuild(&handle);

            // Sync autostart with settings
            {
                use tauri_plugin_autostart::ManagerExt;
                let s = services::settings::get();
                let want = s.get("autoStart").and_then(|v| v.as_bool()).unwrap_or(false);
                let mgr = handle.autolaunch();
                if let Ok(cur) = mgr.is_enabled() {
                    if want && !cur { let _ = mgr.enable(); }
                    if !want && cur { let _ = mgr.disable(); }
                }
            }

            services::activity::push("info", "Aras Antivirus started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ps::run_ps,
            commands::ps::cancel_task,
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::history::history_add,
            commands::history::history_list,
            commands::history::history_search,
            commands::history::history_stats,
            commands::history::history_by_action,
            commands::threat::threat_add,
            commands::threat::threat_list,
            commands::threat::threat_search,
            commands::threat::threat_stats,
            commands::threat::threat_by_type,
            commands::threat::threat_update_action,
            commands::threat::threat_delete,
            commands::system::resource_usage,
            commands::system::user_paths,
            commands::window::window_minimize,
            commands::window::window_maximize,
            commands::window::window_close,
            commands::guard::activity_recent,
            commands::guard::guard_control,
            commands::guard::autostart_set,
            commands::guard::autostart_is_enabled,
            commands::quarantine::quarantine_isolate,
            commands::quarantine::quarantine_restore,
            commands::quarantine::quarantine_purge,
            commands::yara::yara_scan,
            commands::yara::yara_reload,
            commands::yara::yara_rule_count,
            commands::updater::check_for_update,
            commands::updater::download_and_install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
