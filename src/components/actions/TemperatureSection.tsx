import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setTemperature } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Flame, Square } from "lucide-react";

const HOTEND_PRESETS = [0, 190, 210, 250];
const BED_PRESETS = [0, 60, 70, 110];

export function TemperatureSection() {
  const extruder = usePrinterStore((s) => s.extruder);
  const bed = usePrinterStore((s) => s.heater_bed);
  const [keypad, setKeypad] = useState<{ heater: string; label: string; max: number } | null>(null);

  return (
    <div className="space-y-4">
      {/* Hotend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-500" />
            <span className="text-sm font-medium">Hotend</span>
          </div>
          <span className="text-sm tabular-nums">
            {extruder.temperature.toFixed(0)}° / {extruder.target > 0 ? `${extruder.target}°` : "Off"}
          </span>
        </div>
        <div className="flex gap-1.5">
          {HOTEND_PRESETS.map((t) => (
            <Button
              key={t}
              variant={extruder.target === t ? "default" : "outline"}
              size="sm"
              className="flex-1"
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Square size={14} className="text-blue-500" />
            <span className="text-sm font-medium">Bed</span>
          </div>
          <span className="text-sm tabular-nums">
            {bed.temperature.toFixed(0)}° / {bed.target > 0 ? `${bed.target}°` : "Off"}
          </span>
        </div>
        <div className="flex gap-1.5">
          {BED_PRESETS.map((t) => (
            <Button
              key={t}
              variant={bed.target === t ? "default" : "outline"}
              size="sm"
              className="flex-1"
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
