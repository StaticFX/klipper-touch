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
        variant="ghost"
        onClick={() => setShowKeypad(true)}
        className="h-auto p-3 flex-col items-start gap-0 text-left bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="text-[10px] landscape:text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl landscape:text-[28px] font-bold leading-none tabular-nums">
          {current.toFixed(1)}°
        </div>
        <div className="flex flex-col landscape:flex-row landscape:items-center landscape:justify-between mt-1.5 landscape:mt-2 w-full gap-0.5">
          <span className="text-xs landscape:text-sm text-muted-foreground truncate">
            Target: {target > 0 ? `${target}°` : "Off"}
          </span>
          <span className={`text-[10px] landscape:text-xs font-medium tabular-nums ${power > 0 ? "text-primary" : "text-muted-foreground"}`}>
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
