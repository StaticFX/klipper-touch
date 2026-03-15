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
          <span className={`text-xs font-medium tabular-nums ${power > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {power > 0 ? `Heating ${Math.round(power * 100)}%` : "Idle"}
          </span>
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
