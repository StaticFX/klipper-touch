use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MacroConfig {
    pub name: String,
    pub gcode: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default = "default_moonraker_url")]
    pub moonraker_url: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub macros: Vec<MacroConfig>,
}

fn default_theme() -> String {
    "light".to_string()
}

fn default_moonraker_url() -> String {
    "http://localhost:7125".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            moonraker_url: default_moonraker_url(),
            theme: default_theme(),
            macros: vec![],
        }
    }
}

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("~/.config"))
        .join("klipper-touch")
        .join("config.toml")
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    // In dev, check for config.dev.toml in the project root first
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("config.dev.toml"));

    let path = dev_path
        .filter(|p| p.exists())
        .unwrap_or_else(|| {
            let p = config_path();
            if p.exists() { p } else { PathBuf::new() }
        });

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {e}"))?;
    let config: AppConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config: {e}"))?;
    Ok(config)
}
