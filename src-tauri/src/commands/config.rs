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
pub struct MovementConfig {
    #[serde(default)]
    pub invert_x: bool,
    #[serde(default)]
    pub invert_y: bool,
    #[serde(default)]
    pub invert_z: bool,
    #[serde(default = "default_xy_speed")]
    pub xy_speed: f64,
    #[serde(default = "default_z_speed")]
    pub z_speed: f64,
}

fn default_xy_speed() -> f64 {
    100.0
}

fn default_z_speed() -> f64 {
    10.0
}

impl Default for MovementConfig {
    fn default() -> Self {
        Self {
            invert_x: false,
            invert_y: false,
            invert_z: false,
            xy_speed: default_xy_speed(),
            z_speed: default_z_speed(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemperatureConfig {
    #[serde(default = "default_hotend_presets")]
    pub hotend_presets: Vec<i32>,
    #[serde(default = "default_bed_presets")]
    pub bed_presets: Vec<i32>,
}

fn default_hotend_presets() -> Vec<i32> {
    vec![0, 190, 210, 250]
}

fn default_bed_presets() -> Vec<i32> {
    vec![0, 60, 70, 110]
}

impl Default for TemperatureConfig {
    fn default() -> Self {
        Self {
            hotend_presets: default_hotend_presets(),
            bed_presets: default_bed_presets(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtruderConfig {
    #[serde(default = "default_feed_amount")]
    pub default_feed_amount: f64,
    #[serde(default = "default_feed_speed")]
    pub default_feed_speed: f64,
    #[serde(default)]
    pub load_macro: String,
    #[serde(default)]
    pub unload_macro: String,
    #[serde(default = "default_filament_diameter")]
    pub filament_diameter: f64,
}

fn default_feed_amount() -> f64 {
    10.0
}

fn default_feed_speed() -> f64 {
    5.0
}

fn default_filament_diameter() -> f64 {
    1.75
}

impl Default for ExtruderConfig {
    fn default() -> Self {
        Self {
            default_feed_amount: default_feed_amount(),
            default_feed_speed: default_feed_speed(),
            load_macro: String::new(),
            unload_macro: String::new(),
            filament_diameter: default_filament_diameter(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FanConfig {
    #[serde(default = "default_fan_presets")]
    pub speed_presets: Vec<i32>,
}

fn default_fan_presets() -> Vec<i32> {
    vec![0, 25, 50, 75, 100]
}

impl Default for FanConfig {
    fn default() -> Self {
        Self {
            speed_presets: default_fan_presets(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UtilityShortcut {
    pub name: String,
    pub gcode: String,
    #[serde(default)]
    pub confirm: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UtilityConfig {
    #[serde(default = "default_utility_shortcuts")]
    pub shortcuts: Vec<UtilityShortcut>,
}

fn default_utility_shortcuts() -> Vec<UtilityShortcut> {
    vec![
        UtilityShortcut { name: "Motors Off".to_string(), gcode: "M84".to_string(), confirm: false },
        UtilityShortcut { name: "Restart FW".to_string(), gcode: "FIRMWARE_RESTART".to_string(), confirm: true },
        UtilityShortcut { name: "Bed Mesh".to_string(), gcode: "BED_MESH_CALIBRATE".to_string(), confirm: true },
    ]
}

impl Default for UtilityConfig {
    fn default() -> Self {
        Self {
            shortcuts: default_utility_shortcuts(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default = "default_moonraker_url")]
    pub moonraker_url: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub macros: Vec<MacroConfig>,
    #[serde(default)]
    pub movement: MovementConfig,
    #[serde(default)]
    pub temperature: TemperatureConfig,
    #[serde(default)]
    pub extruder: ExtruderConfig,
    #[serde(default)]
    pub fan: FanConfig,
    #[serde(default)]
    pub utility: UtilityConfig,
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
            movement: MovementConfig::default(),
            temperature: TemperatureConfig::default(),
            extruder: ExtruderConfig::default(),
            fan: FanConfig::default(),
            utility: UtilityConfig::default(),
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

/// Resolve the writable config path (dev or production).
fn writable_config_path() -> PathBuf {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|p| p.join("config.dev.toml"));

    if let Some(p) = dev_path.filter(|p| p.exists()) {
        return p;
    }

    config_path()
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let path = writable_config_path();

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }

    let content = toml::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}
