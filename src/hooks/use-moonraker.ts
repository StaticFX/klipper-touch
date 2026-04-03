import { useEffect, useRef } from "react";
import { MoonrakerWebSocket } from "@/lib/moonraker/websocket";
import { setBaseUrl } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";
import { useConsoleStore } from "@/stores/console-store";
import { useUiStore } from "@/stores/ui-store";
import { useToastStore } from "@/stores/toast-store";
import { getConfig } from "@/lib/config";

// Parse input shaper info from gcode responses (same approach as KlipperScreen)
const SHAPER_CURRENT_RE = /shaper_type_([xy]):(\S+)\s+shaper_freq_[xy]:([0-9.]+)(?:\s+damping_ratio_[xy]:([0-9.]+))?/;
const SHAPER_RECOMMENDED_RE = /recommended shaper_type_([xy])\s*=\s*(\S+),\s*shaper_freq_[xy]\s*=\s*([0-9.]+)/i;

function parseInputShaperResponse(message: string) {
  const lower = message.toLowerCase();
  if (!lower.includes("shaper_type_")) return;

  const store = usePrinterStore.getState();
  const current = store.inputShaper;

  // Match current values: "shaper_type_x:mzv shaper_freq_x:48.400 ..."
  const cur = SHAPER_CURRENT_RE.exec(lower);
  if (cur) {
    const axis = cur[1]; // "x" or "y"
    const type = cur[2];
    const freq = parseFloat(cur[3]);
    const damping = cur[4] ? parseFloat(cur[4]) : undefined;
    const updates: Record<string, string | number> = {};
    updates[`shaper_type_${axis}`] = type;
    updates[`shaper_freq_${axis}`] = freq;
    if (damping !== undefined) updates[`damping_ratio_${axis}`] = damping;
    usePrinterStore.setState({
      inputShaper: { ...(current ?? { shaper_type_x: "mzv", shaper_type_y: "mzv", shaper_freq_x: 0, shaper_freq_y: 0, damping_ratio_x: 0.1, damping_ratio_y: 0.1 }), ...updates },
    });
    return;
  }

  // Match recommended: "Recommended shaper_type_x = mzv, shaper_freq_x = 48.4 Hz"
  const rec = SHAPER_RECOMMENDED_RE.exec(message);
  if (rec) {
    const axis = rec[1].toLowerCase();
    const type = rec[2].toLowerCase();
    const freq = parseFloat(rec[3]);
    const updates: Record<string, string | number> = {};
    updates[`shaper_type_${axis}`] = type;
    updates[`shaper_freq_${axis}`] = freq;
    usePrinterStore.setState({
      inputShaper: { ...(current ?? { shaper_type_x: "mzv", shaper_type_y: "mzv", shaper_freq_x: 0, shaper_freq_y: 0, damping_ratio_x: 0.1, damping_ratio_y: 0.1 }), ...updates },
    });
  }
}

export function useMoonraker() {
  const wsRef = useRef<MoonrakerWebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const config = await getConfig();
      if (cancelled) return;

      // Apply theme from config (if not overridden by localStorage)
      if (!localStorage.getItem("klipper-touch-theme")) {
        useUiStore.getState().setTheme(config.theme);
      }

      setBaseUrl(config.moonraker_url);
      const wsUrl = config.moonraker_url
        .replace(/^http/, "ws")
        .replace(/\/$/, "") + "/websocket";

      const ws = new MoonrakerWebSocket(
        wsUrl,
        (data) => {
          usePrinterStore.getState().updateStatus(data);
          usePrintStore.getState().updateStatus(data);
        },
        (connected, error) => {
          usePrinterStore.getState().setMoonrakerConnected(connected, error);
        },
        (state, message) => {
          usePrinterStore.getState().setKlippyState(state as "ready" | "startup" | "shutdown" | "error" | "unknown", message);
        },
        (hostname) => {
          usePrinterStore.getState().setHostname(hostname);
        },
      );

      ws.setGcodeResponseHandler((message) => {
        useConsoleStore.getState().addLine({
          message,
          time: Date.now() / 1000,
          type: "response",
        });

        // Klipper prefixes errors with "!!"
        if (message.startsWith("!!")) {
          useToastStore.getState().addToast(message.replace(/^!!\s*/, ""), "error");
        }

        // Parse input shaper values from gcode responses
        // Current values: "shaper_type_x:mzv shaper_freq_x:48.400 damping_ratio_x:0.100000"
        // Recommended:    "Recommended shaper_type_x = mzv, shaper_freq_x = 48.4 Hz"
        parseInputShaperResponse(message);
      });

      wsRef.current = ws;
      ws.connect();
    }

    init();

    return () => {
      cancelled = true;
      wsRef.current?.disconnect();
    };
  }, []);
}
