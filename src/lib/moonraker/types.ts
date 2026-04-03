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
  minimum_cruise_ratio: number;
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

export interface ExcludeObjectStatus {
  current_object: string | null;
  excluded_objects: string[];
  objects: { name: string; center?: [number, number]; polygon?: [number, number][] }[];
}

export interface FirmwareRetractionStatus {
  retract_length: number;
  retract_speed: number;
  unretract_extra_length: number;
  unretract_speed: number;
}

export interface InputShaperStatus {
  shaper_type_x: string;
  shaper_type_y: string;
  shaper_freq_x: number;
  shaper_freq_y: number;
  damping_ratio_x: number;
  damping_ratio_y: number;
}

export interface QueryEndstopsStatus {
  last_query: Record<string, unknown>; // e.g. { "x": "open", "y": "open", "z": "TRIGGERED" }
}

export interface BeaconSample {
  dist?: number;
  distance?: number;
  z?: number;
  temp?: number;
  freq?: number;
  frequency?: number;
  value?: number;
  pos?: [number, number, number];
  time?: number;
  vel?: number;
  [key: string]: unknown;
}

export interface BeaconStatus {
  last_z_result: number | null;
  last_sample: BeaconSample | null;
  model: string | null;
  models: Record<string, unknown>;
}

export interface HistoryJob {
  job_id: string;
  exists: boolean;
  end_time: number;
  filament_used: number;
  filename: string;
  metadata: {
    thumbnails?: { relative_path: string; width: number; height: number }[];
    estimated_time?: number;
    slicer?: string;
    layer_height?: number;
    object_height?: number;
  };
  print_duration: number;
  status: "completed" | "cancelled" | "error" | "in_progress";
  start_time: number;
  total_duration: number;
}

export interface HistoryTotals {
  total_jobs: number;
  total_time: number;
  total_filament_used: number;
  longest_job: number;
  longest_print: number;
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
