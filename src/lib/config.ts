import { invoke } from "@tauri-apps/api/core";

export interface MacroConfig {
  name: string;
  gcode: string;
  color?: string;
  confirm: boolean;
}

export interface MovementConfig {
  invert_x: boolean;
  invert_y: boolean;
  invert_z: boolean;
  xy_speed: number;
  z_speed: number;
}

export interface TemperatureConfig {
  hotend_presets: number[];
  bed_presets: number[];
}

export interface ExtruderConfig {
  default_feed_amount: number;
  default_feed_speed: number;
  load_macro: string;
  unload_macro: string;
  filament_diameter: number;
}

export interface FanConfig {
  speed_presets: number[];
}

export interface UtilityShortcut {
  name: string;
  gcode: string;
  confirm: boolean;
}

export interface UtilityConfig {
  shortcuts: UtilityShortcut[];
}

export interface BeaconConfig {
  live_polling_enabled: boolean;
  poll_interval_ms: number;
}

export interface AppConfig {
  moonraker_url: string;
  theme: "light" | "dark";
  macros: MacroConfig[];
  movement: MovementConfig;
  temperature: TemperatureConfig;
  extruder: ExtruderConfig;
  fan: FanConfig;
  utility: UtilityConfig;
  beacon: BeaconConfig;
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke("save_config", { config });
}
