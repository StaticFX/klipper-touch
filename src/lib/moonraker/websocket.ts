import WebSocket from "@tauri-apps/plugin-websocket";
import type { JsonRpcRequest, JsonRpcResponse } from "./types";

type StatusUpdateHandler = (data: Record<string, unknown>) => void;
type ConnectionHandler = (connected: boolean, error?: string) => void;
type KlippyHandler = (state: string, message: string) => void;
type HostnameHandler = (hostname: string) => void;

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

const SUBSCRIBED_OBJECTS: Record<string, string[] | null> = {
  extruder: null,
  heater_bed: null,
  fan: null,
  bed_mesh: null,
  print_stats: null,
  toolhead: ["position", "homed_axes"],
  gcode_move: [
    "gcode_position",
    "homing_origin",
    "speed",
    "speed_factor",
    "extrude_factor",
  ],
  display_status: null,
  virtual_sdcard: null,
};

const FAN_PREFIXES = ["fan", "heater_fan ", "controller_fan ", "fan_generic ", "temperature_fan "];
function isFanObject(name: string): boolean {
  return FAN_PREFIXES.some((p) => name === p.trim() || name.startsWith(p));
}

// Singleton so the rest of the app can call moonraker.call()
let instance: MoonrakerWebSocket | null = null;
export function getMoonraker(): MoonrakerWebSocket | null {
  return instance;
}

export class MoonrakerWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private nextId = 1;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;
  private onStatusUpdate: StatusUpdateHandler;
  private onConnection: ConnectionHandler;
  private onKlippy: KlippyHandler;
  private onHostname: HostnameHandler;
  private serverInfoId = -1;
  private pending = new Map<number, PendingCall>();

  constructor(
    url: string,
    onStatusUpdate: StatusUpdateHandler,
    onConnection: ConnectionHandler,
    onKlippy: KlippyHandler,
    onHostname: HostnameHandler,
  ) {
    this.url = url;
    this.onStatusUpdate = onStatusUpdate;
    this.onConnection = onConnection;
    this.onKlippy = onKlippy;
    this.onHostname = onHostname;
    instance = this; // eslint-disable-line @typescript-eslint/no-this-alias
  }

  /** Send a JSON-RPC call and return the result as a promise. */
  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("WebSocket not connected"));
        return;
      }
      const id = this.nextId++;
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      const request: JsonRpcRequest = { jsonrpc: "2.0", method, params, id };
      this.ws.send(JSON.stringify(request));
    });
  }

  async connect() {
    this.shouldReconnect = true;
    try {
      this.ws = await WebSocket.connect(this.url);
      this.reconnectDelay = 1000;
      this.onConnection(true);

      this.ws.addListener((msg) => {
        if (typeof msg === "object" && "data" in msg && typeof msg.data === "string") {
          try {
            const parsed = JSON.parse(msg.data) as JsonRpcResponse;
            this.handleMessage(parsed);
          } catch {
            // ignore parse errors
          }
        } else if (typeof msg === "object" && "data" in msg && msg.data === null) {
          console.warn("WebSocket closed by server");
          this.onConnection(false, "Moonraker closed the connection");
          this.rejectAllPending("Connection lost");
          this.ws = null;
          this.scheduleReconnect();
        }
      });

      // Query server info first to check klippy state
      this.serverInfoId = this.nextId;
      this.send("server.info");
      await this.subscribe();
    } catch (err) {
      console.error("WebSocket connection failed:", err);
      this.onConnection(false, `Cannot connect to Moonraker at ${this.url}`);
      this.rejectAllPending("Connection failed");
      this.scheduleReconnect();
    }
  }

  private async subscribe() {
    // Discover fan objects and subscribe to everything
    try {
      const result = await this.call<{ objects: string[] }>("printer.objects.list");
      const fanObjects: Record<string, null> = {};
      for (const obj of result.objects) {
        if (isFanObject(obj)) {
          fanObjects[obj] = null;
        }
      }
      const allObjects = { ...SUBSCRIBED_OBJECTS, ...fanObjects };
      this.send("printer.objects.query", { objects: allObjects });
      this.send("printer.objects.subscribe", { objects: allObjects });
    } catch {
      // Fallback to known objects only
      this.send("printer.objects.query", { objects: SUBSCRIBED_OBJECTS });
      this.send("printer.objects.subscribe", { objects: SUBSCRIBED_OBJECTS });
    }

    // Fetch hostname
    try {
      const sysInfo = await this.call<{ system_info: { hostname?: string } }>("machine.system_info");
      if (sysInfo?.system_info?.hostname) {
        this.onHostname(sysInfo.system_info.hostname);
      }
    } catch {
      // ignore — hostname is optional
    }
  }

  private handleMessage(msg: JsonRpcResponse) {
    // Klippy state notifications
    if (msg.method === "notify_klippy_ready") {
      this.onKlippy("ready", "");
      this.subscribe();
      return;
    }
    if (msg.method === "notify_klippy_disconnected") {
      this.onKlippy("error", "Klippy has disconnected from Moonraker");
      return;
    }
    if (msg.method === "notify_klippy_shutdown") {
      this.onKlippy("shutdown", "Klipper firmware has shut down");
      return;
    }

    // Status updates
    if (msg.method === "notify_status_update") {
      const params = msg.params as unknown[];
      if (params && params[0]) {
        this.onStatusUpdate(params[0] as Record<string, unknown>);
      }
      return;
    }

    // RPC responses (have an id)
    if (msg.id != null) {
      // Server info response
      if (msg.id === this.serverInfoId && msg.result) {
        const info = msg.result as {
          klippy_connected?: boolean;
          klippy_state?: string;
          state_message?: string;
        };
        const state = info.klippy_state || (info.klippy_connected ? "ready" : "error");
        const message = info.state_message || "";
        this.onKlippy(state, info.klippy_connected === false
          ? "Klipper (klippy) is not connected to Moonraker. Is klipper running?"
          : message);
      }

      // Resolve pending call promises
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
        return;
      }

      // Non-pending responses with status data
      if (msg.result && typeof msg.result === "object") {
        const result = msg.result as { status?: Record<string, unknown> };
        if (result.status) {
          this.onStatusUpdate(result.status);
        }
      }
    }

    if (msg.error) {
      console.warn("Moonraker RPC error:", msg.error.message);
    }
  }

  /** Fire-and-forget send (used internally for subscriptions). */
  private send(method: string, params?: Record<string, unknown>) {
    if (!this.ws) return;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.nextId++,
    };
    this.ws.send(JSON.stringify(request));
  }

  private rejectAllPending(reason: string) {
    for (const [id, pending] of this.pending) {
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  async disconnect() {
    this.shouldReconnect = false;
    this.rejectAllPending("Disconnecting");
    if (this.ws) {
      await this.ws.disconnect();
      this.ws = null;
    }
    instance = null;
    this.onConnection(false);
  }
}
