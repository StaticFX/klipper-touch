import { create } from "zustand";
import type {
  ExtruderStatus,
  HeaterStatus,
  ToolheadStatus,
  GcodeMoveStatus,
} from "@/lib/moonraker/types";

interface TemperatureSample {
  time: number;
  extruder: number;
  bed: number;
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
  fans: Record<string, FanInfo>;
  bedMesh: BedMeshData | null;
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
  fans: {},
  bedMesh: null,
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

    // Handle fan objects
    let fansUpdated = false;
    const currentFans = { ...get().fans };
    for (const key of Object.keys(data)) {
      if (isFanKey(key)) {
        const fanData = data[key] as Partial<FanInfo>;
        currentFans[key] = { ...currentFans[key], speed: 0, ...fanData };
        fansUpdated = true;
      }
    }
    if (fansUpdated) {
      updates.fans = currentFans;
    }

    // Record temperature sample
    if (data.extruder || data.heater_bed) {
      const state = get();
      const extTemp = (data.extruder as Partial<ExtruderStatus>)?.temperature ?? state.extruder.temperature;
      const bedTemp = (data.heater_bed as Partial<HeaterStatus>)?.temperature ?? state.heater_bed.temperature;
      const now = Date.now() / 1000;
      const history = [...state.temperatureHistory, { time: now, extruder: extTemp, bed: bedTemp }];
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
      updates.temperatureHistory = history;
    }

    set(updates);
  },
}));
