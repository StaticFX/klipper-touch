import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";
import { useUiStore } from "@/stores/ui-store";
import { emergencyStop } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { OctagonX } from "lucide-react";

export function StatusBar() {
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
      </div>
      <div className="flex items-center gap-2">
        <PrinterStatusBadge state={printState} />
        <Button
          variant="destructive"
          size="sm"
          className="font-semibold"
          onClick={() =>
            showConfirm({
              title: "Emergency Stop",
              message: "This will immediately halt the printer. Continue?",
              onConfirm: () => emergencyStop(),
            })
          }
        >
          <OctagonX size={18} />
          E-STOP
        </Button>
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
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors[state] ?? colors.standby}`}
    >
      {state}
    </span>
  );
}
