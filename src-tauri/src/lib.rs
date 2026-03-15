mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::config::get_config,
            commands::network::get_network_info,
            commands::network::scan_wifi,
            commands::network::connect_wifi,
            commands::network::forget_wifi,
            commands::network::list_saved_wifi,
            commands::update::perform_update,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.with_webview(|webview| {
                #[cfg(target_os = "linux")]
                {
                    use webkit2gtk::WebViewExt;
                    use webkit2gtk::SettingsExt;
                    if let Some(settings) = webview.inner().settings() {
                        settings.set_zoom_text_only(false);
                        settings.set_enable_smooth_scrolling(true);
                    }
                    webview.inner().set_zoom_level(1.0);
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
