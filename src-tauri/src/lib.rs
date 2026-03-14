mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::config::get_config,
            commands::network::get_network_info,
            commands::update::perform_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
