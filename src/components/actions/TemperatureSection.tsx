import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { setTemperature } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { useTemperatureConfigStore } from "@/stores/temperature-config-store";
import { useUiStore } from "@/stores/ui-store";
import { TemperatureGraph } from "@/components/dashboard/TemperatureGraph";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import type { SectionMode } from "./ActionsPage";
import { Flame, Square, Plus, X, Eye, EyeOff } from "lucide-react";

/* ── Settings ────────────────────────────────────────── */

function TemperatureSettings() {
  const hotendPresets = useTemperatureConfigStore((s) => s.hotendPresets);
  const bedPresets = useTemperatureConfigStore((s) => s.bedPresets);
  const setHotendPresets = useTemperatureConfigStore((s) => s.setHotendPresets);
  const setBedPresets = useTemperatureConfigStore((s) => s.setBedPresets);
  const hiddenSensors = useUiStore((s) => s.hiddenSensors);
  const toggleSensor = useUiStore((s) => s.toggleSensor);
  const [keypad, setKeypad] = useState<{ target: "hotend" | "bed"; index: number } | null>(null);

  // Discover all known sensors from temperature history
  const history = usePrinterStore((s) => s.temperatureHistory);
  const allSensors = history.length > 0
    ? Object.keys(history[history.length - 1].temps).sort()
    : ["extruder", "bed"];

  const removePreset = (target: "hotend" | "bed", index: number) => {
    if (target === "hotend") setHotendPresets(hotendPresets.filter((_, i) => i !== index));
    else setBedPresets(bedPresets.filter((_, i) => i !== index));
  };

  const sensorLabel = (key: string): string => {
    const parts = key.split(" ");
    if (parts.length > 1) {
      const name = parts.slice(1).join(" ");
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Temperature Settings</div>

      {/* Hotend presets */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Hotend Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {hotendPresets.map((t, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-10 text-xs"
              onClick={() => setKeypad({ target: "hotend", index: i })}
            >
              {t === 0 ? "Off" : `${t}°`}
              {t !== 0 && (
                <span
                  className="ml-1 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); removePreset("hotend", i); }}
                >
                  <X size={10} />
                </span>
              )}
            </Button>
          ))}
          <Button variant="outline" className="h-10 text-xs" onClick={() => setKeypad({ target: "hotend", index: -1 })}>
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* Bed presets */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Bed Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {bedPresets.map((t, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-10 text-xs"
              onClick={() => setKeypad({ target: "bed", index: i })}
            >
              {t === 0 ? "Off" : `${t}°`}
              {t !== 0 && (
                <span
                  className="ml-1 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); removePreset("bed", i); }}
                >
                  <X size={10} />
                </span>
              )}
            </Button>
          ))}
          <Button variant="outline" className="h-10 text-xs" onClick={() => setKeypad({ target: "bed", index: -1 })}>
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* Sensor visibility */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Visible Sensors</div>
        <div className="space-y-1">
          {allSensors.map((key) => {
            const hidden = hiddenSensors.includes(key);
            return (
              <Button
                key={key}
                variant="outline"
                className="w-full h-10 justify-between px-4"
                onClick={() => toggleSensor(key)}
              >
                <span className="text-sm">{sensorLabel(key)}</span>
                {hidden
                  ? <EyeOff size={14} className="text-muted-foreground" />
                  : <Eye size={14} className="text-primary" />
                }
              </Button>
            );
          })}
        </div>
      </div>

      {keypad && (
        <NumericKeypad
          title={keypad.target === "hotend" ? "Hotend Preset" : "Bed Preset"}
          initialValue={keypad.index >= 0
            ? (keypad.target === "hotend" ? hotendPresets[keypad.index] : bedPresets[keypad.index])
            : 0}
          unit="°C"
          min={0}
          max={keypad.target === "hotend" ? 300 : 120}
          onSubmit={(v) => {
            if (keypad.target === "hotend") {
              if (keypad.index >= 0) {
                const next = [...hotendPresets];
                next[keypad.index] = v;
                setHotendPresets(next);
              } else {
                setHotendPresets([...hotendPresets, v].sort((a, b) => a - b));
              }
            } else {
              if (keypad.index >= 0) {
                const next = [...bedPresets];
                next[keypad.index] = v;
                setBedPresets(next);
              } else {
                setBedPresets([...bedPresets, v].sort((a, b) => a - b));
              }
            }
            setKeypad(null);
          }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}

/* ── Main controls ───────────────────────────────────── */

export function TemperatureSection({ mode }: { mode: SectionMode }) {
  const extruder = usePrinterStore((s) => s.extruder);
  const bed = usePrinterStore((s) => s.heater_bed);
  const [keypad, setKeypad] = useState<{ heater: string; label: string; max: number } | null>(null);

  const loaded = useTemperatureConfigStore((s) => s.loaded);
  const loadFromConfig = useTemperatureConfigStore((s) => s.loadFromConfig);
  const hotendPresets = useTemperatureConfigStore((s) => s.hotendPresets);
  const bedPresets = useTemperatureConfigStore((s) => s.bedPresets);

  useEffect(() => {
    if (!loaded) loadFromConfig();
  }, [loaded, loadFromConfig]);

  if (mode === "settings") return <TemperatureSettings />;

  return (
    <div className="space-y-3">
      {/* Temperature graph */}
      <div className="h-40">
        <TemperatureGraph />
      </div>

      {/* Hotend */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-500" />
            <span className="text-sm font-medium">Hotend</span>
          </div>
          <span className="text-sm tabular-nums">
            {extruder.temperature.toFixed(0)}° / {extruder.target > 0 ? `${extruder.target}°` : "Off"}
          </span>
        </div>
        <div className="grid grid-cols-3 landscape:flex gap-1.5">
          {hotendPresets.map((t) => (
            <Button
              key={t}
              variant={extruder.target === t ? "default" : "outline"}
              size="sm"
              className="landscape:flex-1"
              onClick={() => setTemperature("extruder", t)}
            >
              {t === 0 ? "Off" : `${t}°`}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKeypad({ heater: "extruder", label: "Hotend", max: 300 })}
          >
            ...
          </Button>
        </div>
      </div>

      {/* Bed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Square size={14} className="text-blue-500" />
            <span className="text-sm font-medium">Bed</span>
          </div>
          <span className="text-sm tabular-nums">
            {bed.temperature.toFixed(0)}° / {bed.target > 0 ? `${bed.target}°` : "Off"}
          </span>
        </div>
        <div className="grid grid-cols-3 landscape:flex gap-1.5">
          {bedPresets.map((t) => (
            <Button
              key={t}
              variant={bed.target === t ? "default" : "outline"}
              size="sm"
              className="landscape:flex-1"
              onClick={() => setTemperature("heater_bed", t)}
            >
              {t === 0 ? "Off" : `${t}°`}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKeypad({ heater: "heater_bed", label: "Bed", max: 120 })}
          >
            ...
          </Button>
        </div>
      </div>

      {/* Cooldown */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          setTemperature("extruder", 0);
          setTemperature("heater_bed", 0);
        }}
      >
        Cooldown All
      </Button>

      {keypad && (
        <NumericKeypad
          title={`Set ${keypad.label} Temperature`}
          initialValue={0}
          unit="°C"
          min={0}
          max={keypad.max}
          onSubmit={(v) => {
            setTemperature(keypad.heater, v);
            setKeypad(null);
          }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}
