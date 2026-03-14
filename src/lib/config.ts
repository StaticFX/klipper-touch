import { invoke } from "@tauri-apps/api/core";

export interface MacroConfig {
  name: string;
  gcode: string;
  color?: string;
  confirm: boolean;
}

export interface AppConfig {
  moonraker_url: string;
  theme: "light" | "dark";
  macros: MacroConfig[];
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}
