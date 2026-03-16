import { useState } from "react";
import { setTemperature } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="outline"
        onClick={() => setShowKeypad(true)}
        className="h-auto p-3.5 flex-col items-start gap-0 text-left"
      >
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-[28px] font-bold leading-none tabular-nums">
          {current.toFixed(1)}°
        </div>
        <div className="flex items-center justify-between mt-2 w-full">
          <span className="text-sm text-muted-foreground">
            Target: {target > 0 ? `${target}°` : "Off"}
          </span>
          <span className={`text-xs font-medium tabular-nums ${power > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {power > 0 ? `Heating ${Math.round(power * 100)}%` : "Idle"}
          </span>
        </div>
      </Button>
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
