import { useCallback, useEffect, useState } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { useBeaconConfigStore } from "@/stores/beacon-config-store";
import { useGcode } from "@/hooks/use-gcode";
import { useBeaconLive } from "@/hooks/use-beacon-live";
import {
  beaconCalibrate,
  beaconEstimateBacklash,
  beaconOffsetCompare,
  beaconApplyZOffset,
  beaconModelSelect,
  beaconModelSave,
  queryBeacon,
} from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Button } from "@/components/ui/button";
import { Search, Play, Save, Check } from "lucide-react";
import type { SectionMode } from "./ActionsPage";

function fmtNum(v: number | null | undefined, decimals: number, unit: string): string {
  return v != null ? `${v.toFixed(decimals)} ${unit}` : "—";
}

const POLL_PRESETS = [
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
];

function BeaconSettings() {
  const loaded = useBeaconConfigStore((s) => s.loaded);
  const loadFromConfig = useBeaconConfigStore((s) => s.loadFromConfig);
  const pollingEnabled = useBeaconConfigStore((s) => s.livePollingEnabled);
  const pollInterval = useBeaconConfigStore((s) => s.pollIntervalMs);
  const setPollingEnabled = useBeaconConfigStore((s) => s.setLivePollingEnabled);
  const setPollInterval = useBeaconConfigStore((s) => s.setPollIntervalMs);
  const [keypad, setKeypad] = useState<{ value: number } | null>(null);

  useEffect(() => {
    if (!loaded) loadFromConfig();
  }, [loaded, loadFromConfig]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Beacon Settings</div>

      {/* Live polling toggle */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Live Z Polling</div>
        <div className="flex gap-2">
          <Button
            variant={pollingEnabled ? "default" : "secondary"}
            className="flex-1 h-12"
            onClick={() => setPollingEnabled(true)}
          >
            Enabled
          </Button>
          <Button
            variant={!pollingEnabled ? "default" : "secondary"}
            className="flex-1 h-12"
            onClick={() => setPollingEnabled(false)}
          >
            Disabled
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Sends BEACON_QUERY periodically to update the live Z distance.
        </p>
      </div>

      {/* Poll interval */}
      {pollingEnabled && (
        <div>
          <div className="text-[11px] text-muted-foreground mb-1.5">Poll Interval</div>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {POLL_PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={pollInterval === p.value ? "default" : "outline"}
                className="h-10 text-xs"
                onClick={() => setPollInterval(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full h-10 justify-between px-3"
            onClick={() => setKeypad({ value: pollInterval })}
          >
            <span className="text-xs text-muted-foreground">Custom Interval</span>
            <span className="text-sm font-semibold tabular-nums">{(pollInterval / 1000).toFixed(1)}s</span>
          </Button>
        </div>
      )}

      {keypad && (
        <NumericKeypad
          title="Poll Interval"
          initialValue={pollInterval / 1000}
          unit="s"
          min={0.5}
          max={60}
          allowDecimal={true}
          onSubmit={(v) => { setPollInterval(Math.round(v * 1000)); setKeypad(null); }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}

export function BeaconSection({ mode }: { mode: SectionMode }) {
  const beacon = usePrinterStore((s) => s.beacon);
  const connected = usePrinterStore((s) => s.klippyState) === "ready";
  const showConfirm = useUiStore((s) => s.showConfirm);
  const { send, busy } = useGcode();

  const configLoaded = useBeaconConfigStore((s) => s.loaded);
  const loadConfig = useBeaconConfigStore((s) => s.loadFromConfig);

  useEffect(() => {
    if (!configLoaded) loadConfig();
  }, [configLoaded, loadConfig]);

  const disabled = !connected || busy;
  const liveDist = useBeaconLive();

  const handleQuery = useCallback(async () => {
    await send("BEACON_QUERY");
    queryBeacon().catch(() => {});
  }, [send]);

  const handleCalibrate = useCallback(() => {
    showConfirm({
      title: "Beacon Calibrate",
      message: "This will move the Z axis to measure probe response. The toolhead must be near the bed. Continue?",
      onConfirm: () => beaconCalibrate(),
    });
  }, [showConfirm]);

  const handleEstimateBacklash = useCallback(() => {
    showConfirm({
      title: "Estimate Backlash",
      message: "This will move the Z axis up and down to estimate backlash. Continue?",
      onConfirm: () => beaconEstimateBacklash(),
    });
  }, [showConfirm]);

  const handleOffsetCompare = useCallback(() => {
    showConfirm({
      title: "Compare Z Offset",
      message: "This will compare the current Z offset with the Beacon measurement. Continue?",
      onConfirm: () => beaconOffsetCompare(),
    });
  }, [showConfirm]);

  const handleApplyZOffset = useCallback(() => {
    showConfirm({
      title: "Apply Z Offset",
      message: "This will apply the measured Z offset to the probe configuration. Continue?",
      onConfirm: () => beaconApplyZOffset(),
    });
  }, [showConfirm]);

  const handleSaveModel = useCallback(() => {
    showConfirm({
      title: "Save Model",
      message: "Save the current Beacon model to configuration?",
      onConfirm: () => beaconModelSave(),
    });
  }, [showConfirm]);

  const runCalibration = useCallback((axis: "x" | "y" | "both") => {
    const cmd = axis === "both" ? "SHAPER_CALIBRATE" : `SHAPER_CALIBRATE AXIS=${axis}`;
    showConfirm({
      title: "Run Shaper Calibration",
      message: `This will vibrate the printer to measure resonance on ${axis === "both" ? "both axes" : `the ${axis.toUpperCase()} axis`}. Uses Beacon's built-in accelerometer. Continue?`,
      onConfirm: () => send(cmd),
    });
  }, [showConfirm, send]);

  if (mode === "settings") return <BeaconSettings />;

  const lastZ = beacon?.last_z_result;
  const sample = beacon?.last_sample;
  const sampleFreq = sample?.value as number | undefined;
  const activeModel = beacon?.model;
  const models = beacon?.models ?? {};
  const modelNames = Object.keys(models);

  return (
    <div className="space-y-3">
      {/* Live Z Distance */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Live Z Distance</div>
        <div className="flex items-end justify-between mb-2">
          <div className="text-3xl font-bold tabular-nums">
            {liveDist != null ? `${liveDist.toFixed(3)}` : "—"}
            <span className="text-sm font-normal text-muted-foreground ml-1">mm</span>
          </div>
          <Button variant="outline" size="sm" disabled={disabled} onClick={handleQuery}>
            <Search size={14} /> Query
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Last Probe" value={fmtNum(lastZ, 3, "mm")} />
          <StatBox label="Probe Temp" value={fmtNum(sample?.temp, 1, "°C")} />
          <StatBox label="Frequency" value={fmtNum(sampleFreq, 0, "Hz")} />
        </div>
      </Card>

      {/* Probe Info */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Probe Info</div>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Active Model" value={activeModel ? String(activeModel) : "—"} />
          <StatBox label="Temperature" value={fmtNum(sample?.temp, 1, "°C")} />
          <StatBox label="Frequency" value={fmtNum(sampleFreq, 0, "Hz")} />
        </div>
      </Card>

      {/* Calibration */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Calibration</div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" disabled={disabled} onClick={handleCalibrate}>
            <Play size={14} /> Calibrate
          </Button>
          <Button variant="outline" disabled={disabled} onClick={handleEstimateBacklash}>
            <Play size={14} /> Est. Backlash
          </Button>
          <Button variant="outline" disabled={disabled} onClick={handleOffsetCompare}>
            <Play size={14} /> Compare Offset
          </Button>
          <Button variant="outline" disabled={disabled} onClick={handleApplyZOffset}>
            <Check size={14} /> Apply Z Offset
          </Button>
        </div>
      </Card>

      {/* Models */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Models</div>
          <Button variant="outline" size="sm" disabled={disabled} onClick={handleSaveModel}>
            <Save size={14} /> Save Model
          </Button>
        </div>
        {modelNames.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No models found. Run calibration first.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {modelNames.map((name) => (
              <Button
                key={name}
                variant={activeModel === name ? "default" : "secondary"}
                size="xs"
                disabled={disabled}
                onClick={() => beaconModelSelect(name)}
              >
                {String(name)}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* Accelerometer */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Accelerometer (Shaper Calibration)</div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Uses Beacon's built-in accelerometer for input shaper calibration.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Button variant="outline" disabled={disabled} onClick={() => runCalibration("x")}>
            <Play size={14} /> X Axis
          </Button>
          <Button variant="outline" disabled={disabled} onClick={() => runCalibration("y")}>
            <Play size={14} /> Y Axis
          </Button>
          <Button variant="default" disabled={disabled} onClick={() => runCalibration("both")}>
            <Play size={14} /> Both
          </Button>
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Changes apply immediately. Use SAVE_CONFIG to make permanent.
      </p>
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
