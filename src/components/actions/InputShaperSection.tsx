import { useState, useCallback } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { useGcode } from "@/hooks/use-gcode";
import { setInputShaper } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { ShaperGraph } from "./ShaperGraph";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, WifiOff } from "lucide-react";
import type { SectionMode } from "./ActionsPage";

const SHAPER_TYPES = ["zv", "mzv", "zvd", "ei", "2hump_ei", "3hump_ei"];

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

  // Merge live data with defaults so missing fields don't crash
  const shaper = { ...DEFAULT_SHAPER, ...liveShaper };
  const isLive = liveShaper !== null;

  const [localFreqX, setLocalFreqX] = useState<number | null>(null);
  const [localFreqY, setLocalFreqY] = useState<number | null>(null);
  const [keypad, setKeypad] = useState<{
    title: string; value: number; min: number; max: number; unit: string;
    onSubmit: (v: number) => void;
  } | null>(null);

  const runCalibration = useCallback((axis: "x" | "y" | "both") => {
    const cmd = axis === "both" ? "SHAPER_CALIBRATE" : `SHAPER_CALIBRATE AXIS=${axis}`;
    showConfirm({
      title: "Run Input Shaper Calibration",
      message: `This will vibrate the printer to measure resonance on ${axis === "both" ? "both axes" : `the ${axis.toUpperCase()} axis`}. An ADXL345 accelerometer must be connected. Continue?`,
      onConfirm: () => send(cmd),
    });
  }, [showConfirm, send]);

  const freqX = localFreqX ?? shaper.shaper_freq_x;
  const freqY = localFreqY ?? shaper.shaper_freq_y;

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
      <ShaperGraph axis="x" shaperFreq={shaper.shaper_freq_x} />
      <ShaperGraph axis="y" shaperFreq={shaper.shaper_freq_y} />

      {/* X axis */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">X Axis</div>
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1.5">Shaper Type</div>
          <div className="flex flex-wrap gap-1">
            {SHAPER_TYPES.map((t) => (
              <Button
                key={t}
                variant={shaper.shaper_type_x === t ? "default" : "secondary"}
                size="xs"
                disabled={!connected}
                onClick={() => setInputShaper({ shaper_type_x: t })}
              >
                {t.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Frequency</span>
          <button
            className="text-sm font-bold tabular-nums active:text-primary transition-colors"
            disabled={!connected}
            onClick={() => setKeypad({
              title: "X Shaper Frequency", value: shaper.shaper_freq_x, min: 1, max: 150, unit: "Hz",
              onSubmit: (v) => { setInputShaper({ shaper_freq_x: v }); setKeypad(null); },
            })}
          >
            {freqX > 0 ? `${freqX.toFixed(1)} Hz` : "— Hz"}
          </button>
        </div>
        <Slider
          min={10} max={100} step={0.5}
          value={[freqX || 40]}
          disabled={!connected}
          onValueChange={([v]) => setLocalFreqX(v)}
          onValueCommit={([v]) => { setLocalFreqX(null); setInputShaper({ shaper_freq_x: v }); }}
        />
      </Card>

      {/* Y axis */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Y Axis</div>
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1.5">Shaper Type</div>
          <div className="flex flex-wrap gap-1">
            {SHAPER_TYPES.map((t) => (
              <Button
                key={t}
                variant={shaper.shaper_type_y === t ? "default" : "secondary"}
                size="xs"
                disabled={!connected}
                onClick={() => setInputShaper({ shaper_type_y: t })}
              >
                {t.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Frequency</span>
          <button
            className="text-sm font-bold tabular-nums active:text-primary transition-colors"
            disabled={!connected}
            onClick={() => setKeypad({
              title: "Y Shaper Frequency", value: shaper.shaper_freq_y, min: 1, max: 150, unit: "Hz",
              onSubmit: (v) => { setInputShaper({ shaper_freq_y: v }); setKeypad(null); },
            })}
          >
            {freqY > 0 ? `${freqY.toFixed(1)} Hz` : "— Hz"}
          </button>
        </div>
        <Slider
          min={10} max={100} step={0.5}
          value={[freqY || 40]}
          disabled={!connected}
          onValueChange={([v]) => setLocalFreqY(v)}
          onValueCommit={([v]) => { setLocalFreqY(null); setInputShaper({ shaper_freq_y: v }); }}
        />
      </Card>

      {/* Calibration */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Auto-Calibrate</div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Requires an ADXL345 accelerometer connected to the printer.
        </p>
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

      <p className="text-[11px] text-muted-foreground text-center">
        Changes apply immediately. Use SAVE_CONFIG to make permanent.
      </p>

      {keypad && (
        <NumericKeypad
          title={keypad.title}
          initialValue={keypad.value}
          unit={keypad.unit}
          min={keypad.min}
          max={keypad.max}
          allowDecimal={true}
          onSubmit={keypad.onSubmit}
          onCancel={() => setKeypad(null)}
        />
      )}
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
