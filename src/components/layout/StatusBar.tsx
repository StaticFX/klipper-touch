import { useState, useEffect } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";
import { useUiStore } from "@/stores/ui-store";
import { emergencyStop } from "@/lib/moonraker/client";
import { OctagonX } from "lucide-react";

function useViewportDebug() {
  const [info, setInfo] = useState("");
  useEffect(() => {
    const update = () => {
      setInfo(`${window.innerWidth}x${window.innerHeight} dpr:${window.devicePixelRatio}`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return info;
}

export function StatusBar() {
  const debug = useViewportDebug();
  const moonraker = usePrinterStore((s) => s.moonrakerConnected);
  const klippy = usePrinterStore((s) => s.klippyState);
  const hostname = usePrinterStore((s) => s.hostname);
  const printState = usePrintStore((s) => s.print_stats.state);
  const showConfirm = useUiStore((s) => s.showConfirm);

  const dotColor = !moonraker
    ? "bg-red-500"
    : klippy === "ready"
      ? "bg-green-500"
      : klippy === "startup"
        ? "bg-yellow-500"
        : "bg-orange-500";

  const label = !moonraker
    ? "Moonraker offline"
    : klippy === "ready"
      ? "Connected"
      : klippy === "startup"
        ? "Klipper starting"
        : "Klipper offline";

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        {hostname && <span className="font-medium text-foreground">{hostname}</span>}
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">[{debug}]</span>
      </div>
      <div className="flex items-center gap-2">
        <PrinterStatusBadge state={printState} />
        <button
          onClick={() =>
            showConfirm({
              title: "Emergency Stop",
              message: "This will immediately halt the printer. Continue?",
              onConfirm: () => emergencyStop(),
            })
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold active:scale-95 transition-transform"
        >
          <OctagonX size={18} />
          E-STOP
        </button>
      </div>
    </div>
  );
}

function PrinterStatusBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    standby: "bg-muted text-muted-foreground",
    printing: "bg-primary/20 text-primary",
    paused: "bg-yellow-500/20 text-yellow-500",
    complete: "bg-green-500/20 text-green-600",
    cancelled: "bg-muted text-muted-foreground",
    error: "bg-destructive/20 text-destructive",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${colors[state] ?? colors.standby}`}
    >
      {state}
    </span>
  );
}
