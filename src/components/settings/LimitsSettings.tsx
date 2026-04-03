import { useState } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { sendGcode } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { NumericKeypad } from "@/components/common/NumericKeypad";

interface LimitRow {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  param: string;
  decimals?: number;
  allowDecimal?: boolean;
}

export function LimitsSettings() {
  const toolhead = usePrinterStore((s) => s.toolhead);
  const [keypad, setKeypad] = useState<LimitRow | null>(null);

  const limits: LimitRow[] = [
    {
      label: "Max Velocity",
      unit: "mm/s",
      value: toolhead.max_velocity,
      min: 1,
      max: 2000,
      param: "VELOCITY",
    },
    {
      label: "Max Acceleration",
      unit: "mm/s\u00B2",
      value: toolhead.max_accel,
      min: 1,
      max: 100000,
      param: "ACCEL",
    },
    {
      label: "Min Cruise Ratio",
      unit: "",
      value: toolhead.minimum_cruise_ratio,
      min: 0,
      max: 1,
      param: "MINIMUM_CRUISE_RATIO",
      decimals: 2,
      allowDecimal: true,
    },
    {
      label: "Square Corner Velocity",
      unit: "mm/s",
      value: toolhead.square_corner_velocity,
      min: 0,
      max: 100,
      param: "SQUARE_CORNER_VELOCITY",
    },
  ];

  const applyLimit = (param: string, value: number) => {
    sendGcode(`SET_VELOCITY_LIMIT ${param}=${value}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          Changes apply immediately but are not saved to printer.cfg until you save config.
        </div>
      </div>

      <div className="space-y-2">
        {limits.map((limit) => (
          <Button
            key={limit.param}
            variant="outline"
            className="w-full h-auto justify-between px-4 py-3"
            onClick={() => setKeypad(limit)}
          >
            <div className="text-left">
              <div className="text-sm font-medium">{limit.label}</div>
              {limit.unit && (
                <div className="text-[10px] text-muted-foreground">{limit.unit}</div>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {limit.decimals != null ? limit.value.toFixed(limit.decimals) : Math.round(limit.value)}
            </span>
          </Button>
        ))}
      </div>

      {keypad && (
        <NumericKeypad
          title={keypad.label}
          initialValue={keypad.decimals != null ? Number(keypad.value.toFixed(keypad.decimals)) : Math.round(keypad.value)}
          unit={keypad.unit || ""}
          min={keypad.min}
          max={keypad.max}
          allowDecimal={keypad.allowDecimal}
          onSubmit={(v) => {
            applyLimit(keypad.param, v);
            setKeypad(null);
          }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}
