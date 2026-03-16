import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { useExtruderConfigStore } from "@/stores/extruder-config-store";
import { setTemperature } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Input } from "@/components/ui/input";
import type { SectionMode } from "./ActionsPage";
import { ArrowDownToLine, ArrowUpFromLine, Flame, Droplets, Loader2 } from "lucide-react";

const FEED_LENGTHS = [1, 5, 10, 25, 50];
const FEED_SPEEDS = [1, 3, 5, 10]; // mm/s

/* ── Settings ────────────────────────────────────────── */

function ExtruderSettings() {
  const store = useExtruderConfigStore();
  const [keypad, setKeypad] = useState<{
    field: "feedAmount" | "feedSpeed" | "filDiameter";
    current: number;
  } | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Extruder Settings</div>

      {/* Numeric settings */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "feedAmount", current: store.defaultFeedAmount })}
        >
          <span className="text-sm text-muted-foreground">Default Feed Amount</span>
          <span className="text-sm font-medium tabular-nums">{store.defaultFeedAmount} mm</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "feedSpeed", current: store.defaultFeedSpeed })}
        >
          <span className="text-sm text-muted-foreground">Default Feed Speed</span>
          <span className="text-sm font-medium tabular-nums">{store.defaultFeedSpeed} mm/s</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "filDiameter", current: store.filamentDiameter })}
        >
          <span className="text-sm text-muted-foreground">Filament Diameter</span>
          <span className="text-sm font-medium tabular-nums">{store.filamentDiameter} mm</span>
        </Button>
      </div>

      {/* Macro names */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Load/Unload Macros</div>
        <div className="text-[10px] text-muted-foreground mb-2">
          Leave empty to use default G-code (heat + extrude/retract 100mm).
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Load Macro</label>
            <Input
              value={store.loadMacro}
              onChange={(e) => store.setLoadMacro(e.target.value.toUpperCase())}
              placeholder="e.g. LOAD_FILAMENT"
              className="h-10 font-mono text-sm"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Unload Macro</label>
            <Input
              value={store.unloadMacro}
              onChange={(e) => store.setUnloadMacro(e.target.value.toUpperCase())}
              placeholder="e.g. UNLOAD_FILAMENT"
              className="h-10 font-mono text-sm"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {keypad && (() => {
        const meta: Record<string, { title: string; unit: string; min: number; max: number }> = {
          feedAmount: { title: "Default Feed Amount", unit: "mm", min: 1, max: 200 },
          feedSpeed: { title: "Default Feed Speed", unit: "mm/s", min: 1, max: 50 },
          filDiameter: { title: "Filament Diameter", unit: "mm", min: 1, max: 3 },
        };
        const m = meta[keypad.field];
        return (
          <NumericKeypad
            title={m.title}
            initialValue={keypad.current}
            unit={m.unit}
            min={m.min}
            max={m.max}
            onSubmit={(v) => {
              switch (keypad.field) {
                case "feedAmount": store.setDefaultFeedAmount(v); break;
                case "feedSpeed": store.setDefaultFeedSpeed(v); break;
                case "filDiameter": store.setFilamentDiameter(v); break;
              }
              setKeypad(null);
            }}
            onCancel={() => setKeypad(null)}
          />
        );
      })()}
    </div>
  );
}

/* ── Main controls ───────────────────────────────────── */

export function ExtruderSection({ mode }: { mode: SectionMode }) {
  const { send, busy } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);
  const extruder = usePrinterStore((s) => s.extruder);
  const extrudeVelocity = usePrinterStore((s) => s.motionReport.live_extruder_velocity);

  const configLoaded = useExtruderConfigStore((s) => s.loaded);
  const loadFromConfig = useExtruderConfigStore((s) => s.loadFromConfig);
  const defaultFeedAmount = useExtruderConfigStore((s) => s.defaultFeedAmount);
  const defaultFeedSpeed = useExtruderConfigStore((s) => s.defaultFeedSpeed);
  const loadMacro = useExtruderConfigStore((s) => s.loadMacro);
  const unloadMacro = useExtruderConfigStore((s) => s.unloadMacro);
  const filamentDiameter = useExtruderConfigStore((s) => s.filamentDiameter);

  useEffect(() => {
    if (!configLoaded) loadFromConfig();
  }, [configLoaded, loadFromConfig]);

  const [feedLength, setFeedLength] = useState(defaultFeedAmount);
  const [feedSpeed, setFeedSpeed] = useState(defaultFeedSpeed);
  const [tempKeypad, setTempKeypad] = useState(false);

  useEffect(() => {
    if (configLoaded) {
      setFeedLength(defaultFeedAmount);
      setFeedSpeed(defaultFeedSpeed);
    }
  }, [configLoaded, defaultFeedAmount, defaultFeedSpeed]);

  if (mode === "settings") return <ExtruderSettings />;

  const extrude = (dir: number) => {
    const f = feedSpeed * 60;
    send(`M83\nG1 E${dir * feedLength} F${f}\nM82`);
  };

  const loadFilament = () => {
    if (loadMacro) {
      showConfirm({
        title: "Load Filament",
        message: `Run ${loadMacro}? Make sure filament is inserted.`,
        onConfirm: () => send(loadMacro),
      });
    } else {
      showConfirm({
        title: "Load Filament",
        message: "Heat hotend to 210° and extrude 100mm. Make sure filament is inserted.",
        onConfirm: () => send("M104 S210\nG4 P2000\nM83\nG1 E100 F200\nM82"),
      });
    }
  };

  const unloadFilament = () => {
    if (unloadMacro) {
      showConfirm({
        title: "Unload Filament",
        message: `Run ${unloadMacro}?`,
        onConfirm: () => send(unloadMacro),
      });
    } else {
      showConfirm({
        title: "Unload Filament",
        message: "Heat hotend to 210° and retract 100mm.",
        onConfirm: () => send("M104 S210\nG4 P2000\nM83\nG1 E-100 F200\nM82"),
      });
    }
  };

  // Volumetric flow: velocity (mm/s) * cross section area (mm²)
  const crossSection = Math.PI * (filamentDiameter / 2) ** 2;
  const volumetricFlow = Math.abs(extrudeVelocity) * crossSection;

  return (
    <div className="space-y-4">
      {/* Hotend status bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
        <Flame size={20} className={extruder.target > 0 ? "text-orange-500" : "text-muted-foreground"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tabular-nums">{extruder.temperature.toFixed(0)}°</span>
            <span className="text-sm text-muted-foreground">
              / {extruder.target > 0 ? `${extruder.target}°` : "Off"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1">
              <Droplets size={10} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {volumetricFlow.toFixed(1)} mm³/s
              </span>
            </div>
            <span className={`text-[11px] ${extruder.power > 0 ? "text-primary" : "text-muted-foreground"}`}>
              {extruder.power > 0 ? `Heating ${Math.round(extruder.power * 100)}%` : "Idle"}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-10 text-xs shrink-0"
          onClick={() => setTempKeypad(true)}
        >
          Set Temp
        </Button>
      </div>

      {/* Feed length */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1">Feed Amount (mm)</div>
        <div className="flex gap-1.5">
          {FEED_LENGTHS.map((l) => (
            <Button
              key={l}
              variant={feedLength === l ? "default" : "outline"}
              className="flex-1 h-10 text-xs"
              onClick={() => setFeedLength(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed speed */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1">Feed Speed (mm/s)</div>
        <div className="flex gap-1.5">
          {FEED_SPEEDS.map((s) => (
            <Button
              key={s}
              variant={feedSpeed === s ? "default" : "outline"}
              className="flex-1 h-10 text-xs"
              onClick={() => setFeedSpeed(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Extrude / Retract */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 text-sm" disabled={busy} onClick={() => extrude(-1)}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Retract
        </Button>
        <Button variant="outline" className="h-12 text-sm" disabled={busy} onClick={() => extrude(1)}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Extrude
        </Button>
      </div>

      {/* Load / Unload */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-12 text-sm" disabled={busy} onClick={loadFilament}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          Load
        </Button>
        <Button variant="secondary" className="h-12 text-sm" disabled={busy} onClick={unloadFilament}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
          Unload
        </Button>
      </div>

      {tempKeypad && (
        <NumericKeypad
          title="Hotend Temperature"
          initialValue={extruder.target}
          unit="°C"
          min={0}
          max={300}
          onSubmit={(v) => {
            setTemperature("extruder", v);
            setTempKeypad(false);
          }}
          onCancel={() => setTempKeypad(false)}
        />
      )}
    </div>
  );
}
