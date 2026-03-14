import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";
import { useMovementStore } from "@/stores/movement-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, ChevronLeft, Home, Loader2, Settings, Power,
} from "lucide-react";

const STEP_SIZES = [0.1, 1, 10, 100];

function MovementSettings({ onBack }: { onBack: () => void }) {
  const invertX = useMovementStore((s) => s.invertX);
  const invertY = useMovementStore((s) => s.invertY);
  const invertZ = useMovementStore((s) => s.invertZ);
  const xySpeed = useMovementStore((s) => s.defaultXySpeed);
  const zSpeed = useMovementStore((s) => s.defaultZSpeed);
  const setInvertX = useMovementStore((s) => s.setInvertX);
  const setInvertY = useMovementStore((s) => s.setInvertY);
  const setInvertZ = useMovementStore((s) => s.setInvertZ);
  const setXySpeed = useMovementStore((s) => s.setDefaultXySpeed);
  const setZSpeed = useMovementStore((s) => s.setDefaultZSpeed);
  const [keypad, setKeypad] = useState<{ field: "xy" | "z"; current: number } | null>(null);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <div className="text-sm font-medium">Movement Settings</div>

      {/* Invert axes */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Invert Axis Direction</div>
        <div className="flex gap-2">
          {([["X", invertX, setInvertX], ["Y", invertY, setInvertY], ["Z", invertZ, setInvertZ]] as const).map(
            ([label, value, setter]) => (
              <button
                key={label}
                onClick={() => setter(!value)}
                className={`flex-1 h-12 rounded-lg border text-sm font-medium ${
                  value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {label} {value ? "(inverted)" : "(normal)"}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Default speeds */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Default Speeds</div>
        <div className="space-y-2">
          <button
            onClick={() => setKeypad({ field: "xy", current: xySpeed })}
            className="w-full text-left"
          >
            <div className="h-12 rounded-lg border border-border px-4 flex items-center justify-between bg-card active:bg-accent/50">
              <span className="text-sm text-muted-foreground">XY Speed</span>
              <span className="text-sm font-medium tabular-nums">{xySpeed} mm/s</span>
            </div>
          </button>
          <button
            onClick={() => setKeypad({ field: "z", current: zSpeed })}
            className="w-full text-left"
          >
            <div className="h-12 rounded-lg border border-border px-4 flex items-center justify-between bg-card active:bg-accent/50">
              <span className="text-sm text-muted-foreground">Z Speed</span>
              <span className="text-sm font-medium tabular-nums">{zSpeed} mm/s</span>
            </div>
          </button>
        </div>
      </div>

      {keypad && (
        <NumericKeypad
          title={keypad.field === "xy" ? "Default XY Speed" : "Default Z Speed"}
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

export function MovementSection() {
  const { send, busy } = useGcode();
  const [stepSize, setStepSize] = useState(10);
  const [page, setPage] = useState<"controls" | "settings">("controls");

  const zPos = usePrinterStore((s) => s.toolhead.position[2]);
  const homedAxes = usePrinterStore((s) => s.toolhead.homed_axes);
  const allHomed = "xyz".split("").every((a) => homedAxes.includes(a));

  const invertX = useMovementStore((s) => s.invertX);
  const invertY = useMovementStore((s) => s.invertY);
  const invertZ = useMovementStore((s) => s.invertZ);
  const xySpeed = useMovementStore((s) => s.defaultXySpeed);
  const zSpeed = useMovementStore((s) => s.defaultZSpeed);

  const xDir = invertX ? -1 : 1;
  const yDir = invertY ? -1 : 1;
  const zDir = invertZ ? -1 : 1;

  if (page === "settings") {
    return <MovementSettings onBack={() => setPage("controls")} />;
  }

  const moveXY = (axis: string, dir: number) => {
    const f = xySpeed * 60;
    send(`G91\nG1 ${axis}${dir * stepSize} F${f}\nG90`);
  };
  const moveZ = (dir: number) => {
    const f = zSpeed * 60;
    send(`G91\nG1 Z${dir * stepSize} F${f}\nG90`);
  };

  const jogBtn = "h-16 w-16 rounded-xl text-base";

  return (
    <div className="space-y-4">
      {/* Two-column layout: controls left, settings right */}
      <div className="flex gap-4">
        {/* Left: XY cross + Z — centered */}
        <div className="flex gap-3 shrink-0">
          {/* XY Pad */}
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", yDir)}>
              <ArrowUp size={22} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", -xDir)}>
              <ArrowLeft size={22} />
            </Button>
            <div className="flex items-center justify-center text-xs text-muted-foreground font-medium">
              XY
            </div>
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", xDir)}>
              <ArrowRight size={22} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", -yDir)}>
              <ArrowDown size={22} />
            </Button>
            <div />
          </div>

          {/* Z Controls */}
          <div className="flex flex-col items-center gap-1.5 w-16">
            <Button variant="outline" className="h-16 w-full rounded-xl" onClick={() => moveZ(zDir)}>
              <ChevronUp size={22} />
            </Button>
            <div className="text-center py-1">
              <div className="text-[10px] text-muted-foreground">Z</div>
              <div className="text-xs font-semibold tabular-nums">{zPos.toFixed(2)}</div>
            </div>
            <Button variant="outline" className="h-16 w-full rounded-xl" onClick={() => moveZ(-zDir)}>
              <ChevronDown size={22} />
            </Button>
          </div>
        </div>

        {/* Right: step size, speeds, home, gear */}
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

          {/* Speeds (read-only display, editable in settings) */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-card">
              <div className="text-[10px] text-muted-foreground">XY</div>
              <div className="text-xs font-medium tabular-nums">{xySpeed} mm/s</div>
            </div>
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-card">
              <div className="text-[10px] text-muted-foreground">Z</div>
              <div className="text-xs font-medium tabular-nums">{zSpeed} mm/s</div>
            </div>
          </div>

          {/* Home + Motors Off + Settings */}
          <div className='flex flex-col gap-1.5'>
            <div className="flex gap-1.5">
              <Button
                variant={allHomed ? "secondary" : "default"}
                className="flex-1 h-12"
                disabled={busy}
                onClick={() => send("G28")}
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Home size={18} />}
                {busy ? "Homing…" : "Home"}
              </Button>
              <Button
                variant="outline"
                className="h-12 w-12 shrink-0"
                onClick={() => setPage("settings")}
              >
                <Settings size={18} />
              </Button>
          </div>
                        <Button
                variant="outline"
                className="text-destructive"
                onClick={() => send("M84")}
              >
                <Power size={18} />
                Disable steppers
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
