import { useState } from "react";
import { setTemperature } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";

interface TemperatureCardProps {
  label: string;
  current: number;
  target: number;
  power: number;
  heater: string;
}

export function TemperatureCard({ label, current, target, power, heater }: TemperatureCardProps) {
  const [showKeypad, setShowKeypad] = useState(false);

  const handleSetTemp = async (value: number) => {
    await setTemperature(heater, value);
    setShowKeypad(false);
  };

  return (
    <>
      <button
        onClick={() => setShowKeypad(true)}
        className="bg-card border border-border rounded-lg p-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-[28px] font-bold leading-none tabular-nums">
          {current.toFixed(1)}°
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-muted-foreground">
            Target: {target > 0 ? `${target}°` : "Off"}
          </span>
          {power > 0 && (
            <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${power * 100}%` }}
              />
            </div>
          )}
        </div>
      </button>
      {showKeypad && (
        <NumericKeypad
          title={`Set ${label} Temperature`}
          initialValue={target}
          unit="°C"
          min={0}
          max={heater === "extruder" ? 300 : 120}
          onSubmit={handleSetTemp}
          onCancel={() => setShowKeypad(false)}
        />
      )}
    </>
  );
}
