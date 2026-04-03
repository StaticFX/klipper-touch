import { useCallback, useEffect } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { useGcode } from "@/hooks/use-gcode";
import { sendGcode, saveInputShaperToConfig } from "@/lib/moonraker/client";
import { useToastStore } from "@/stores/toast-store";
import { ShaperGraph } from "./ShaperGraph";
import { Button } from "@/components/ui/button";
import { Play, Search, WifiOff } from "lucide-react";
import type { SectionMode } from "./ActionsPage";

const DEFAULT_SHAPER = {
  shaper_type_x: "mzv",
  shaper_type_y: "mzv",
  shaper_freq_x: 0,
  shaper_freq_y: 0,
  damping_ratio_x: 0.1,
  damping_ratio_y: 0.1,
};

export function InputShaperSection({ mode: _mode }: { mode: SectionMode }) {
  const liveShaper = usePrinterStore((s) => s.inputShaper);
  const connected = usePrinterStore((s) => s.klippyState) === "ready";
  const showConfirm = useUiStore((s) => s.showConfirm);
  const { send, busy } = useGcode();
  const addToast = useToastStore((s) => s.addToast);

  // Query current input shaper values on mount (like KlipperScreen's activate())
  // SET_INPUT_SHAPER with no params returns current values via gcode response
  useEffect(() => {
    if (connected) {
      sendGcode("SET_INPUT_SHAPER").catch(() => {});
    }
  }, [connected]);

  // Merge live data with defaults so missing fields don't crash
  const shaper = { ...DEFAULT_SHAPER, ...liveShaper };
  const isLive = liveShaper !== null;

  const runCalibration = useCallback((axis: "x" | "y" | "both") => {
    const cmd = axis === "both" ? "SHAPER_CALIBRATE" : `SHAPER_CALIBRATE AXIS=${axis}`;
    showConfirm({
      title: "Run Input Shaper Calibration",
      message: `This will vibrate the printer to measure resonance on ${axis === "both" ? "both axes" : `the ${axis.toUpperCase()} axis`}. An ADXL345 accelerometer must be connected. Continue?`,
      onConfirm: () => send(cmd),
    });
  }, [showConfirm, send]);

  return (
    <div className="space-y-3">
      {/* Connection notice */}
      {!isLive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
          <WifiOff size={14} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            {connected
              ? "No [input_shaper] section in printer.cfg — values below are defaults."
              : "Not connected to printer — showing default values."}
          </p>
        </div>
      )}

      {/* Current config */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Current Configuration</div>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="X Shaper" value={shaper.shaper_type_x.toUpperCase()} />
          <StatBox label="Y Shaper" value={shaper.shaper_type_y.toUpperCase()} />
          <StatBox label="X Freq" value={shaper.shaper_freq_x > 0 ? `${shaper.shaper_freq_x.toFixed(1)} Hz` : "—"} />
          <StatBox label="Y Freq" value={shaper.shaper_freq_y > 0 ? `${shaper.shaper_freq_y.toFixed(1)} Hz` : "—"} />
        </div>
      </Card>

      {/* Resonance graphs */}
      <ShaperGraph
        axis="x"
        shaperFreq={shaper.shaper_freq_x}
        onApplyShaper={(type, freq) => {
          showConfirm({
            title: "Apply & Save Input Shaper",
            message: `Set X axis to ${type.toUpperCase()} @ ${freq.toFixed(1)} Hz?\n\nThis will save to printer.cfg and restart the firmware.`,
            onConfirm: async () => {
              try {
                await saveInputShaperToConfig({ shaper_type_x: type, shaper_freq_x: freq });
                addToast(`X shaper set to ${type.toUpperCase()} @ ${freq.toFixed(1)} Hz — saved & restarting`, "info");
              } catch (err) {
                addToast(err instanceof Error ? err.message : String(err), "error");
              }
            },
          });
        }}
      />
      <ShaperGraph
        axis="y"
        shaperFreq={shaper.shaper_freq_y}
        onApplyShaper={(type, freq) => {
          showConfirm({
            title: "Apply & Save Input Shaper",
            message: `Set Y axis to ${type.toUpperCase()} @ ${freq.toFixed(1)} Hz?\n\nThis will save to printer.cfg and restart the firmware.`,
            onConfirm: async () => {
              try {
                await saveInputShaperToConfig({ shaper_type_y: type, shaper_freq_y: freq });
                addToast(`Y shaper set to ${type.toUpperCase()} @ ${freq.toFixed(1)} Hz — saved & restarting`, "info");
              } catch (err) {
                addToast(err instanceof Error ? err.message : String(err), "error");
              }
            },
          });
        }}
      />

      {/* Accelerometer */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Accelerometer</div>
        <Button variant="outline" className="w-full mb-3" disabled={busy || !connected} onClick={() => send("ACCELEROMETER_QUERY")}>
          <Search size={14} /> Query Accelerometer
        </Button>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Auto-Calibrate</div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button variant="outline" disabled={busy || !connected} onClick={() => runCalibration("x")}>
            <Play size={14} /> X Axis
          </Button>
          <Button variant="outline" disabled={busy || !connected} onClick={() => runCalibration("y")}>
            <Play size={14} /> Y Axis
          </Button>
          <Button variant="default" disabled={busy || !connected} onClick={() => runCalibration("both")}>
            <Play size={14} /> Both
          </Button>
        </div>
      </Card>

    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl px-3 py-2.5">{children}</div>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
