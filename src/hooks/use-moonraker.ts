import { useEffect, useRef } from "react";
import { MoonrakerWebSocket } from "@/lib/moonraker/websocket";
import { setBaseUrl } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";
import { useConsoleStore } from "@/stores/console-store";
import { useUiStore } from "@/stores/ui-store";
import { getConfig } from "@/lib/config";

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
