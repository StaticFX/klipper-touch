import { usePrinterStore } from "@/stores/printer-store";
import { sendGcode } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { WifiOff, AlertTriangle, XOctagon, Loader2, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ConnectionOverlay() {
  const moonrakerConnected = usePrinterStore((s) => s.moonrakerConnected);
  const klippyState = usePrinterStore((s) => s.klippyState);
  const klippyMessage = usePrinterStore((s) => s.klippyMessage);
  const errorMessage = usePrinterStore((s) => s.errorMessage);

  if (moonrakerConnected && klippyState === "ready") return null;

  if (!moonrakerConnected) {
    return (
      <ErrorBanner
        icon={WifiOff}
        title="Moonraker Unreachable"
        message={errorMessage || "Cannot connect to Moonraker. Is the service running?"}
        hint="Check that moonraker.service is active and the URL is correct in config.toml"
        color="red"
      />
    );
  }

  if (klippyState === "error" || klippyState === "unknown") {
    return (
      <ErrorBanner
        icon={AlertTriangle}
        title="Klipper Not Connected"
        message={klippyMessage || "Klippy is not connected to Moonraker."}
        hint="Check that klipper.service is running and the MCU is connected"
        color="orange"
        actions={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10" onClick={() => sendGcode("RESTART")}>
              <RotateCcw size={14} />
              Restart Klipper
            </Button>
            <Button variant="outline" className="h-10" onClick={() => sendGcode("FIRMWARE_RESTART")}>
              <RotateCcw size={14} />
              Firmware Restart
            </Button>
          </div>
        }
      />
    );
  }

  if (klippyState === "shutdown") {
    return (
      <ErrorBanner
        icon={XOctagon}
        title="Klipper Shutdown"
        message={klippyMessage || "Klipper firmware has shut down."}
        hint="A firmware restart is usually needed to recover."
        color="red"
        actions={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10" onClick={() => sendGcode("RESTART")}>
              <RotateCcw size={14} />
              Restart Klipper
            </Button>
            <Button variant="outline" className="h-10" onClick={() => sendGcode("FIRMWARE_RESTART")}>
              <RotateCcw size={14} />
              Firmware Restart
            </Button>
          </div>
        }
      />
    );
  }

  if (klippyState === "startup") {
    return (
      <InfoBanner
        title="Klipper Starting..."
        message={klippyMessage || "Waiting for Klipper to finish startup."}
      />
    );
  }

  return null;
}

function ErrorBanner({
  icon: Icon,
  title,
  message,
  hint,
  color,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  hint: string;
  color: "red" | "orange";
  actions?: React.ReactNode;
}) {
  const bg = color === "red" ? "bg-red-500/10 border-red-500/30" : "bg-orange-500/10 border-orange-500/30";
  const titleColor = color === "red" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400";
  const iconColor = color === "red" ? "text-red-500" : "text-orange-500";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md w-full space-y-3">
        <div className={`rounded-xl border p-6 space-y-3 ${bg}`}>
          <div className="flex items-center gap-3">
            <Icon size={28} className={iconColor} />
            <h2 className={`text-lg font-semibold ${titleColor}`}>{title}</h2>
          </div>
          <p className="text-sm text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color === "red" ? "bg-red-400" : "bg-orange-400"}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color === "red" ? "bg-red-500" : "bg-orange-500"}`} />
            </span>
            <span className="text-xs text-muted-foreground">Retrying automatically...</span>
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}

function InfoBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md w-full rounded-xl border border-primary/30 bg-primary/10 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex items-center gap-2 pt-1">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Please wait...</span>
        </div>
      </div>
    </div>
  );
}
