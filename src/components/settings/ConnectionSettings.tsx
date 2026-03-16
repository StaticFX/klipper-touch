import { Badge } from "@/components/ui/badge";
import { usePrinterStore } from "@/stores/printer-store";
import { InfoRow } from "./InfoRow";

export function ConnectionSettings() {
  const moonraker = usePrinterStore((s) => s.moonrakerConnected);
  const klippy = usePrinterStore((s) => s.klippyState);

  return (
    <div className="space-y-3">
      <InfoRow
        label="Moonraker"
        value={
          <Badge variant={moonraker ? "default" : "destructive"}>
            {moonraker ? "Connected" : "Disconnected"}
          </Badge>
        }
      />
      <InfoRow
        label="Klipper"
        value={
          <Badge variant={klippy === "ready" ? "default" : "secondary"}>
            {klippy}
          </Badge>
        }
      />
    </div>
  );
}
