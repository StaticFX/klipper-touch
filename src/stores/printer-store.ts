import { create } from "zustand";
import type {
  ExtruderStatus,
  HeaterStatus,
  ToolheadStatus,
  GcodeMoveStatus,
  MotionReportStatus,
  ExcludeObjectStatus,
  FirmwareRetractionStatus,
  InputShaperStatus,
  QueryEndstopsStatus,
} from "@/lib/moonraker/types";

export interface TemperatureSample {
  time: number;
  temps: Record<string, number>;
}

export type KlippyState = "ready" | "startup" | "shutdown" | "error" | "unknown";

export interface FanInfo {
  speed: number; // 0-1
  rpm?: number;
  temperature?: number; // for temperature_fan
}

export interface BedMeshData {
  profile_name: string;
  mesh_min: [number, number];
  mesh_max: [number, number];
  probed_matrix: number[][];
  mesh_matrix: number[][];
  profiles: Record<string, { points: number[][] }>;
}

export interface ConfigPendingState {
  pending: boolean;
  items: Record<string, Record<string, string>>;
}

interface ConnectionState {
  moonrakerConnected: boolean;
  klippyState: KlippyState;
  klippyMessage: string;
  errorMessage: string;
  hostname: string;
}

interface PrinterStore extends ConnectionState {
  extruder: ExtruderStatus;
  heater_bed: HeaterStatus;
  toolhead: ToolheadStatus;
  gcode_move: GcodeMoveStatus;
  motionReport: MotionReportStatus;
  extraTemps: Record<string, number>;
  fans: Record<string, FanInfo>;
  excludeObject: ExcludeObjectStatus;
  firmwareRetraction: FirmwareRetractionStatus | null;
  inputShaper: InputShaperStatus | null;
  queryEndstops: QueryEndstopsStatus | null;
  bedMesh: BedMeshData | null;
  configPending: ConfigPendingState;
  temperatureHistory: TemperatureSample[];

  setMoonrakerConnected: (connected: boolean, error?: string) => void;
  setKlippyState: (state: KlippyState, message?: string) => void;
  setHostname: (hostname: string) => void;
  updateStatus: (data: Record<string, unknown>) => void;
}

const MAX_HISTORY = 300; // 5 min at 1 sample/sec

const FAN_PREFIXES = ["fan", "heater_fan ", "controller_fan ", "fan_generic ", "temperature_fan "];
function isFanKey(key: string): boolean {
  return FAN_PREFIXES.some((p) => key === p.trim() || key.startsWith(p));
}

const TEMP_SENSOR_PREFIXES = ["heater_generic ", "temperature_sensor "];
function isTempSensorKey(key: string): boolean {
  return TEMP_SENSOR_PREFIXES.some((p) => key.startsWith(p));
}

export const usePrinterStore = create<PrinterStore>((set, get) => ({
  moonrakerConnected: false,
  klippyState: "unknown" as KlippyState,
  klippyMessage: "",
  errorMessage: "",
  hostname: "",
  extruder: { temperature: 0, target: 0, power: 0 },
  heater_bed: { temperature: 0, target: 0, power: 0 },
  toolhead: {
    position: [0, 0, 0, 0],
    homed_axes: "",
    max_velocity: 0,
    max_accel: 0,
    minimum_cruise_ratio: 0.5,
    square_corner_velocity: 0,
    print_time: 0,
    estimated_print_time: 0,
  },
  gcode_move: {
    gcode_position: [0, 0, 0, 0],
    homing_origin: [0, 0, 0, 0],
    speed: 0,
    speed_factor: 1,
    extrude_factor: 1,
  },
  motionReport: {
    live_extruder_velocity: 0,
    live_velocity: 0,
    live_position: [0, 0, 0, 0],
  },
  extraTemps: {},
  fans: {},
  excludeObject: { current_object: null, excluded_objects: [], objects: [] },
  firmwareRetraction: null,
  inputShaper: null,
  queryEndstops: null,
  bedMesh: null,
  configPending: { pending: false, items: {} },
  temperatureHistory: [],

  setMoonrakerConnected: (connected, error) =>
    set({
      moonrakerConnected: connected,
      errorMessage: connected ? "" : error || "Cannot reach Moonraker. Is moonraker running?",
      klippyState: connected ? get().klippyState : "unknown",
    }),

  setKlippyState: (state, message) =>
    set({ klippyState: state, klippyMessage: message || "" }),

  setHostname: (hostname) => set({ hostname }),

  updateStatus: (data) => {
    const updates: Partial<PrinterStore> = {};

    if (data.extruder) {
      updates.extruder = { ...get().extruder, ...(data.extruder as Partial<ExtruderStatus>) };
    }
    if (data.heater_bed) {
      updates.heater_bed = { ...get().heater_bed, ...(data.heater_bed as Partial<HeaterStatus>) };
    }
    if (data.toolhead) {
      updates.toolhead = { ...get().toolhead, ...(data.toolhead as Partial<ToolheadStatus>) };
    }
    if (data.gcode_move) {
      updates.gcode_move = { ...get().gcode_move, ...(data.gcode_move as Partial<GcodeMoveStatus>) };
    }
    if (data.motion_report) {
      updates.motionReport = { ...get().motionReport, ...(data.motion_report as Partial<MotionReportStatus>) };
    }

    // Handle exclude_object
    if (data.exclude_object) {
      updates.excludeObject = { ...get().excludeObject, ...(data.exclude_object as Partial<ExcludeObjectStatus>) };
    }

    // Handle firmware retraction
    if (data.firmware_retraction) {
      const current = get().firmwareRetraction;
      updates.firmwareRetraction = { ...current, ...(data.firmware_retraction as Partial<FirmwareRetractionStatus>) } as FirmwareRetractionStatus;
    }

    // Handle input shaper
    if (data.input_shaper) {
      const current = get().inputShaper;
      updates.inputShaper = { ...current, ...(data.input_shaper as Partial<InputShaperStatus>) } as InputShaperStatus;
    }

    // Handle query_endstops
    if (data.query_endstops) {
      const current = get().queryEndstops;
      updates.queryEndstops = { ...current, ...(data.query_endstops as Partial<QueryEndstopsStatus>) } as QueryEndstopsStatus;
    }

    // Handle bed mesh
    if (data.bed_mesh) {
      const mesh = data.bed_mesh as Partial<BedMeshData>;
      const current = get().bedMesh;
      if (mesh.mesh_matrix && mesh.mesh_matrix.length > 0) {
        updates.bedMesh = { ...current, ...mesh } as BedMeshData;
      } else if (current && mesh.profile_name !== undefined) {
        updates.bedMesh = { ...current, ...mesh } as BedMeshData;
      }
    }

    // Handle configfile (save_config pending)
    if (data.configfile) {
      const cf = data.configfile as Partial<{
        save_config_pending: boolean;
        save_config_pending_items: Record<string, Record<string, string>>;
      }>;
      const current = get().configPending;
      updates.configPending = {
        pending: cf.save_config_pending ?? current.pending,
        items: cf.save_config_pending_items ?? current.items,
      };
    }

    // Handle fan objects and extra temp sensors
    let fansUpdated = false;
    const currentFans = { ...get().fans };
    let extraTempsUpdated = false;
    const currentExtraTemps = { ...get().extraTemps };
    for (const key of Object.keys(data)) {
      if (isFanKey(key)) {
        const fanData = data[key] as Partial<FanInfo>;
        currentFans[key] = { ...currentFans[key], speed: 0, ...fanData };
        fansUpdated = true;
        // temperature_fan also has a temperature
        if (key.startsWith("temperature_fan ") && fanData.temperature != null) {
          currentExtraTemps[key] = fanData.temperature;
          extraTempsUpdated = true;
        }
      } else if (isTempSensorKey(key)) {
        const sensorData = data[key] as { temperature?: number };
        if (sensorData.temperature != null) {
          currentExtraTemps[key] = sensorData.temperature;
          extraTempsUpdated = true;
        }
      }
    }
    if (fansUpdated) updates.fans = currentFans;
    if (extraTempsUpdated) updates.extraTemps = currentExtraTemps;

    // Record temperature sample (any temp update triggers)
    const hasAnyTemp = data.extruder || data.heater_bed || extraTempsUpdated;
    if (hasAnyTemp) {
      const state = get();
      const extTemp = (data.extruder as Partial<ExtruderStatus>)?.temperature ?? state.extruder.temperature;
      const bedTemp = (data.heater_bed as Partial<HeaterStatus>)?.temperature ?? state.heater_bed.temperature;
      const temps: Record<string, number> = {
        extruder: extTemp,
        bed: bedTemp,
      };
      const allExtra = extraTempsUpdated ? currentExtraTemps : state.extraTemps;
      for (const [name, temp] of Object.entries(allExtra)) {
        temps[name] = temp;
      }
      const now = Date.now() / 1000;
      const history = [...state.temperatureHistory, { time: now, temps }];
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
      updates.temperatureHistory = history;
    }

    set(updates);
  },
}));
