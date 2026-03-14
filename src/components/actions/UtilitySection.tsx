import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";
import { Power, RotateCcw, Crosshair, Grid3X3, Loader2 } from "lucide-react";

export function UtilitySection() {
  const { send, busy } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);

  const actions = [
    {
      label: "Motors Off",
      icon: Power,
      action: () => send("M84"),
    },
    {
      label: "Restart FW",
      icon: RotateCcw,
      action: () =>
        showConfirm({
          title: "Firmware Restart",
          message: "Restart the Klipper firmware?",
          onConfirm: () => send("FIRMWARE_RESTART"),
        }),
    },
    {
      label: "PID Hotend",
      icon: Crosshair,
      action: () =>
        showConfirm({
          title: "PID Tune Hotend",
          message: "Run PID calibration for extruder at 210°C? Printer will heat up.",
          onConfirm: () => send("PID_CALIBRATE HEATER=extruder TARGET=210"),
        }),
    },
    {
      label: "PID Bed",
      icon: Crosshair,
      action: () =>
        showConfirm({
          title: "PID Tune Bed",
          message: "Run PID calibration for heater_bed at 60°C? Printer will heat up.",
          onConfirm: () => send("PID_CALIBRATE HEATER=heater_bed TARGET=60"),
        }),
    },
    {
      label: "Bed Mesh",
      icon: Grid3X3,
      action: () =>
        showConfirm({
          title: "Bed Mesh Calibrate",
          message: "Run automatic bed mesh calibration? Printer must be homed first.",
          onConfirm: () => send("BED_MESH_CALIBRATE"),
        }),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Button
            key={a.label}
            variant="outline"
            className="h-14 flex-col gap-1 text-xs"
            disabled={busy}
            onClick={a.action}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
            {a.label}
          </Button>
        );
      })}
    </div>
  );
}
