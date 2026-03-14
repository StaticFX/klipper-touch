import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, Home,
} from "lucide-react";

const STEP_SIZES = [0.1, 1, 10, 100];

export function MovementSection() {
  const { send } = useGcode();
  const [stepSize, setStepSize] = useState(10);
  const [xySpeed, setXySpeed] = useState(100); // mm/s
  const [zSpeed, setZSpeed] = useState(10);    // mm/s
  const [keypad, setKeypad] = useState<{ field: "xy" | "z"; current: number } | null>(null);
  const zPos = usePrinterStore((s) => s.toolhead.position[2]);
  const homedAxes = usePrinterStore((s) => s.toolhead.homed_axes);
  const allHomed = "xyz".split("").every((a) => homedAxes.includes(a));

  const moveXY = (axis: string, dir: number) => {
    const f = xySpeed * 60; // mm/s → mm/min
    send(`G91\nG1 ${axis}${dir * stepSize} F${f}\nG90`);
  };
  const moveZ = (dir: number) => {
    const f = zSpeed * 60;
    send(`G91\nG1 Z${dir * stepSize} F${f}\nG90`);
  };

  const jogBtn = "h-16 w-16 rounded-xl text-base";

  return (
    <div className="space-y-4">
      {/* Main layout: cross + Z on left, settings on right */}
      <div className="flex gap-4">
        {/* Left: XY cross + Z */}
        <div className="flex gap-3 shrink-0">
          {/* XY Pad */}
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", 1)}>
              <ArrowUp size={22} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", -1)}>
              <ArrowLeft size={22} />
            </Button>
            <div className="flex items-center justify-center text-xs text-muted-foreground font-medium">
              XY
            </div>
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", 1)}>
              <ArrowRight size={22} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", -1)}>
              <ArrowDown size={22} />
            </Button>
            <div />
          </div>

          {/* Z Controls */}
          <div className="flex flex-col items-center gap-1.5 w-16">
            <Button variant="outline" className="h-16 w-full rounded-xl" onClick={() => moveZ(1)}>
              <ChevronUp size={22} />
            </Button>
            <div className="text-center py-1">
              <div className="text-[10px] text-muted-foreground">Z</div>
              <div className="text-xs font-semibold tabular-nums">{zPos.toFixed(2)}</div>
            </div>
            <Button variant="outline" className="h-16 w-full rounded-xl" onClick={() => moveZ(-1)}>
              <ChevronDown size={22} />
            </Button>
          </div>
        </div>

        {/* Right: settings */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Step size */}
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Step (mm)</div>
            <div className="grid grid-cols-4 gap-1">
              {STEP_SIZES.map((s) => (
                <Button
                  key={s}
                  variant={stepSize === s ? "default" : "outline"}
                  className="h-10 text-xs px-0"
                  onClick={() => setStepSize(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* XY Speed */}
          <button
            onClick={() => setKeypad({ field: "xy", current: xySpeed })}
            className="w-full text-left"
          >
            <div className="text-[11px] text-muted-foreground mb-1">XY Speed</div>
            <div className="h-10 rounded-lg border border-border px-3 flex items-center justify-between bg-card active:bg-accent/50">
              <span className="text-sm font-medium tabular-nums">{xySpeed}</span>
              <span className="text-xs text-muted-foreground">mm/s</span>
            </div>
          </button>

          {/* Z Speed */}
          <button
            onClick={() => setKeypad({ field: "z", current: zSpeed })}
            className="w-full text-left"
          >
            <div className="text-[11px] text-muted-foreground mb-1">Z Speed</div>
            <div className="h-10 rounded-lg border border-border px-3 flex items-center justify-between bg-card active:bg-accent/50">
              <span className="text-sm font-medium tabular-nums">{zSpeed}</span>
              <span className="text-xs text-muted-foreground">mm/s</span>
            </div>
          </button>

          {/* Home */}
          <Button
            variant={allHomed ? "secondary" : "default"}
            className="w-full h-12"
            onClick={() => send("G28")}
          >
            <Home size={18} />
            Home All
          </Button>
        </div>
      </div>

      {keypad && (
        <NumericKeypad
          title={keypad.field === "xy" ? "XY Speed" : "Z Speed"}
          initialValue={keypad.current}
          unit="mm/s"
          min={1}
          max={keypad.field === "xy" ? 500 : 100}
          onSubmit={(v) => {
            if (keypad.field === "xy") setXySpeed(v);
            else setZSpeed(v);
            setKeypad(null);
          }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}
