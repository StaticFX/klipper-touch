import { getMoonraker } from "./websocket";
import { invoke } from "@tauri-apps/api/core";
import type { GcodeFile, HistoryJob, HistoryTotals } from "./types";

let baseUrl = "http://localhost:7125";

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, "");
}

function rpc<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  const ws = getMoonraker();
  if (!ws) throw new Error("Not connected to Moonraker");
  return ws.call<T>(method, params);
}

export async function sendGcode(script: string): Promise<string> {
  return rpc<string>("printer.gcode.script", { script });
}

export async function homeAxes(axes: string[] = ["X", "Y", "Z"]): Promise<void> {
  await sendGcode(`G28 ${axes.join(" ")}`);
}

export async function setTemperature(
  heater: string,
  target: number
): Promise<void> {
  if (heater === "extruder") {
    await sendGcode(`M104 S${target}`);
  } else if (heater === "heater_bed") {
    await sendGcode(`M140 S${target}`);
  } else {
    await sendGcode(`SET_HEATER_TEMPERATURE HEATER=${heater} TARGET=${target}`);
  }
}

export async function emergencyStop(): Promise<void> {
  await rpc("printer.emergency_stop");
}

export async function getFileList(): Promise<GcodeFile[]> {
  return rpc<GcodeFile[]>("server.files.list", { root: "gcodes" });
}

export async function getFileMetadata(filename: string): Promise<GcodeFile> {
  return rpc<GcodeFile>("server.files.metadata", { filename });
}

export async function startPrint(filename: string): Promise<void> {
  await rpc("printer.print.start", { filename });
}

export async function pausePrint(): Promise<void> {
  await rpc("printer.print.pause");
}

export async function resumePrint(): Promise<void> {
  await rpc("printer.print.resume");
}

export async function cancelPrint(): Promise<void> {
  await rpc("printer.print.cancel");
}

/**
 * Build the thumbnail URL. The thumbnail's relative_path is relative to the
 * gcode file's directory, so we resolve it against the file's parent folder.
 */
export function getThumbnailUrl(gcodeFilename: string, thumbRelativePath: string): string {
  const dir = gcodeFilename.includes("/")
    ? gcodeFilename.substring(0, gcodeFilename.lastIndexOf("/") + 1)
    : "";
  const fullPath = dir + thumbRelativePath;
  const encoded = fullPath.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl}/server/files/gcodes/${encoded}`;
}

export async function deleteFile(filename: string): Promise<void> {
  await rpc("server.files.delete_file", { path: `gcodes/${filename}` });
}

export async function getServerInfo(): Promise<unknown> {
  return rpc("server.info");
}

/** Get all available gcode commands with descriptions */
export async function getGcodeHelp(): Promise<Record<string, string>> {
  return rpc<Record<string, string>>("printer.gcode.help");
}

/** List all printer objects (to find gcode_macro objects) */
export async function getObjectList(): Promise<{ objects: string[] }> {
  return rpc<{ objects: string[] }>("printer.objects.list");
}

/** Query specific printer objects */
export async function queryObjects(objects: Record<string, string[] | null>): Promise<{ status: Record<string, unknown> }> {
  return rpc("printer.objects.query", { objects });
}

/** Get macro parameters from configfile. Returns map of macro name → param names with defaults. */
export async function getMacroParams(): Promise<Record<string, Record<string, string>>> {
  const result = await queryObjects({ configfile: null });
  const config = (result.status?.configfile as { config?: Record<string, Record<string, string>> })?.config ?? {};
  const macroParams: Record<string, Record<string, string>> = {};

  for (const [section, values] of Object.entries(config)) {
    if (!section.startsWith("gcode_macro ")) continue;
    const macroName = section.replace("gcode_macro ", "").toUpperCase();
    const params: Record<string, string> = {};

    // Legacy: default_parameter_NAME keys
    for (const [key, val] of Object.entries(values)) {
      if (key.startsWith("default_parameter_")) {
        const paramName = key.replace("default_parameter_", "").toUpperCase();
        params[paramName] = String(val);
      }
    }

    // Modern: parse params.NAME from Jinja gcode template
    const gcode = values.gcode ?? "";
    // Match params.NAME or params['NAME'] or params["NAME"]
    const dotPattern = /params\.(\w+)/gi;
    const bracketPattern = /params\[['"](\w+)['"]\]/gi;
    for (const m of gcode.matchAll(dotPattern)) {
      const name = m[1].toUpperCase();
      if (!params[name]) {
        // Try to find default value: params.NAME|default(VALUE)
        const defRegex = new RegExp(`params\\.${m[1]}\\|default\\(([^)]+)\\)`, "i");
        const defMatch = gcode.match(defRegex);
        params[name] = defMatch ? defMatch[1].replace(/^['"]|['"]$/g, "") : "";
      }
    }
    for (const m of gcode.matchAll(bracketPattern)) {
      const name = m[1].toUpperCase();
      if (!params[name]) {
        params[name] = "";
      }
    }

    if (Object.keys(params).length > 0) {
      macroParams[macroName] = params;
    }
  }
  return macroParams;
}

/** Set part cooling fan speed (0-1) */
export async function setFanSpeed(speed: number): Promise<void> {
  if (speed === 0) {
    await sendGcode("M107");
  } else {
    const pwm = Math.round(speed * 255);
    await sendGcode(`M106 S${pwm}`);
  }
}

/** Set generic fan speed (0-1). Fan name is the suffix after "fan_generic ". */
export async function setGenericFanSpeed(name: string, speed: number): Promise<void> {
  await sendGcode(`SET_FAN_SPEED FAN=${name} SPEED=${speed.toFixed(2)}`);
}

/** Exclude an object from the current print */
export async function excludeObject(name: string): Promise<void> {
  await sendGcode(`EXCLUDE_OBJECT NAME=${name}`);
}

/** Save pending config changes to printer.cfg (Klipper SAVE_CONFIG) */
export async function saveKlipperConfig(): Promise<void> {
  await sendGcode("SAVE_CONFIG");
}

/** Fetch recent gcode response history */
export interface GcodeStoreEntry {
  message: string;
  time: number;
  type: "command" | "response";
}

export async function getGcodeStore(count = 100): Promise<GcodeStoreEntry[]> {
  const result = await rpc<{ gcode_store: GcodeStoreEntry[] }>(
    "server.gcode_store",
    { count }
  );
  return result.gcode_store ?? [];
}

/** Set pressure advance parameters */
export async function setPressureAdvance(advance: number, smoothTime?: number): Promise<void> {
  let cmd = `SET_PRESSURE_ADVANCE ADVANCE=${advance.toFixed(4)}`;
  if (smoothTime !== undefined) cmd += ` SMOOTH_TIME=${smoothTime.toFixed(4)}`;
  await sendGcode(cmd);
}

/** Set firmware retraction parameters */
export async function setRetraction(params: {
  retract_length?: number;
  retract_speed?: number;
  unretract_extra_length?: number;
  unretract_speed?: number;
}): Promise<void> {
  const parts = ["SET_RETRACTION"];
  if (params.retract_length !== undefined) parts.push(`RETRACT_LENGTH=${params.retract_length.toFixed(3)}`);
  if (params.retract_speed !== undefined) parts.push(`RETRACT_SPEED=${params.retract_speed.toFixed(0)}`);
  if (params.unretract_extra_length !== undefined) parts.push(`UNRETRACT_EXTRA_LENGTH=${params.unretract_extra_length.toFixed(3)}`);
  if (params.unretract_speed !== undefined) parts.push(`UNRETRACT_SPEED=${params.unretract_speed.toFixed(0)}`);
  await sendGcode(parts.join(" "));
}

/** Query endstop states — sends QUERY_ENDSTOPS to refresh, then returns the result from the printer object */
export async function queryEndstops(): Promise<Record<string, unknown>> {
  await sendGcode("QUERY_ENDSTOPS");
  const result = await queryObjects({ query_endstops: null });
  const qs = result.status?.query_endstops as { last_query?: Record<string, unknown> } | undefined;
  return qs?.last_query ?? {};
}

/** Set input shaper parameters */
export async function setInputShaper(params: {
  shaper_type_x?: string;
  shaper_type_y?: string;
  shaper_freq_x?: number;
  shaper_freq_y?: number;
}): Promise<void> {
  const parts = ["SET_INPUT_SHAPER"];
  if (params.shaper_type_x) parts.push(`SHAPER_TYPE_X=${params.shaper_type_x}`);
  if (params.shaper_type_y) parts.push(`SHAPER_TYPE_Y=${params.shaper_type_y}`);
  if (params.shaper_freq_x !== undefined) parts.push(`SHAPER_FREQ_X=${params.shaper_freq_x.toFixed(1)}`);
  if (params.shaper_freq_y !== undefined) parts.push(`SHAPER_FREQ_Y=${params.shaper_freq_y.toFixed(1)}`);
  await sendGcode(parts.join(" "));
}

/** Fetch print history */
export async function getHistory(limit = 20, start = 0): Promise<{ jobs: HistoryJob[]; count: number }> {
  return rpc("server.history.list", { limit, start, order: "desc" });
}

/** Fetch print history totals */
export async function getHistoryTotals(): Promise<HistoryTotals> {
  const result = await rpc<{ job_totals: HistoryTotals }>("server.history.totals");
  return result.job_totals;
}

/** Delete a history job entry */
export async function deleteHistoryJob(uid: string): Promise<void> {
  await rpc("server.history.delete_job", { uid });
}

/** Beacon probe commands */
export async function beaconCalibrate(): Promise<void> {
  await sendGcode("BEACON_CALIBRATE");
}

export async function beaconEstimateBacklash(): Promise<void> {
  await sendGcode("BEACON_ESTIMATE_BACKLASH");
}

export async function beaconOffsetCompare(): Promise<void> {
  await sendGcode("BEACON_OFFSET_COMPARE");
}

export async function beaconApplyZOffset(): Promise<void> {
  await sendGcode("Z_OFFSET_APPLY_PROBE");
}

export async function beaconModelSelect(name: string): Promise<void> {
  await sendGcode(`BEACON_MODEL_SELECT NAME=${name}`);
}

export async function beaconModelSave(name?: string): Promise<void> {
  await sendGcode(name ? `BEACON_MODEL_SAVE NAME=${name}` : "BEACON_MODEL_SAVE");
}

export async function queryBeacon(): Promise<void> {
  // The websocket automatically pushes status data from query responses to the store
  await queryObjects({ beacon: null });
}

/** List files in a root (e.g. "config") */
export async function listFiles(root: string): Promise<{ path: string; modified: number; size: number }[]> {
  return rpc("server.files.list", { root });
}

/** Get raw file content via HTTP */
export function getFileUrl(root: string, path: string): string {
  return `${baseUrl}/server/files/${root}/${encodeURIComponent(path)}`;
}

/**
 * Save input shaper settings to printer.cfg via Moonraker's file API.
 * Flow: download printer.cfg → modify [input_shaper] section → upload → RESTART.
 */
export async function saveInputShaperToConfig(params: {
  shaper_type_x?: string;
  shaper_type_y?: string;
  shaper_freq_x?: number;
  shaper_freq_y?: number;
}): Promise<void> {
  const values: Record<string, string> = {};
  if (params.shaper_type_x) values.shaper_type_x = params.shaper_type_x;
  if (params.shaper_type_y) values.shaper_type_y = params.shaper_type_y;
  if (params.shaper_freq_x !== undefined) values.shaper_freq_x = params.shaper_freq_x.toFixed(1);
  if (params.shaper_freq_y !== undefined) values.shaper_freq_y = params.shaper_freq_y.toFixed(1);

  // 1. Download current printer.cfg
  const content = await invoke<string>("fetch_printer_config", { moonrakerUrl: baseUrl });

  // 2. Modify [input_shaper] in the #*# SAVE_CONFIG override block
  const modified = await invoke<string>("update_config_override", {
    content,
    section: "input_shaper",
    values,
  });

  // 3. Upload modified printer.cfg
  await invoke<void>("upload_printer_config", { moonrakerUrl: baseUrl, content: modified });

  // 4. Restart firmware to apply
  await sendGcode("RESTART");
}
