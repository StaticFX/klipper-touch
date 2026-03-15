import { getMoonraker } from "./websocket";
import type { GcodeFile } from "./types";

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
