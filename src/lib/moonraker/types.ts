export interface PrinterStatus {
  extruder: ExtruderStatus;
  heater_bed: HeaterStatus;
  heater_generic?: Record<string, HeaterStatus>;
  print_stats: PrintStats;
  toolhead: ToolheadStatus;
  gcode_move: GcodeMoveStatus;
  display_status: DisplayStatus;
  virtual_sdcard: VirtualSdCardStatus;
}

export interface ExtruderStatus {
  temperature: number;
  target: number;
  power: number;
  pressure_advance?: number;
}

export interface HeaterStatus {
  temperature: number;
  target: number;
  power: number;
}

export interface PrintStats {
  state: PrintState;
  filename: string;
  total_duration: number;
  print_duration: number;
  filament_used: number;
  message: string;
  info?: {
    total_layer?: number;
    current_layer?: number;
  };
}

export type PrintState =
  | "standby"
  | "printing"
  | "paused"
  | "complete"
  | "cancelled"
  | "error";

export interface ToolheadStatus {
  position: [number, number, number, number];
  homed_axes: string;
  max_velocity: number;
  max_accel: number;
  square_corner_velocity: number;
  print_time: number;
  estimated_print_time: number;
}

export interface GcodeMoveStatus {
  gcode_position: [number, number, number, number];
  homing_origin: [number, number, number, number];
  speed: number;
  speed_factor: number;
  extrude_factor: number;
}

export interface MotionReportStatus {
  live_extruder_velocity: number;
  live_velocity: number;
  live_position: [number, number, number, number];
}

export interface DisplayStatus {
  progress: number;
  message: string;
}

export interface VirtualSdCardStatus {
  progress: number;
  is_active: boolean;
  file_position: number;
  file_path: string;
}

export interface GcodeFile {
  path: string;
  modified: number;
  size: number;
  estimated_time?: number;
  slicer?: string;
  layer_height?: number;
  first_layer_height?: number;
  object_height?: number;
  filament_total?: number;
  thumbnails?: GcodeThumbnail[];
}

export interface GcodeThumbnail {
  width: number;
  height: number;
  size: number;
  relative_path: string;
}

export interface MoonrakerResponse<T = unknown> {
  result: T;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: number;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string };
  id?: number;
  method?: string;
  params?: unknown[];
}
