import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { useBeaconLive } from "@/hooks/use-beacon-live";
import { usePrinterStore } from "@/stores/printer-store";
import { useMovementStore } from "@/stores/movement-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import type { SectionMode } from "./ActionsPage";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, Home, Loader2, Power,
} from "lucide-react";

const STEP_SIZES = [0.1, 1, 10, 100];

/* ── Settings ────────────────────────────────────────── */

function MovementSettings() {
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
      <div className="text-sm font-medium">Movement Settings</div>

      {/* Invert axes */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Invert Axis Direction</div>
        <div className="flex gap-2">
          {([["X", invertX, setInvertX], ["Y", invertY, setInvertY], ["Z", invertZ, setInvertZ]] as const).map(
            ([label, value, setter]) => (
              <Button
                key={label}
                variant={value ? "default" : "secondary"}
                className="flex-1 h-12"
                onClick={() => setter(!value)}
              >
                {label} {value ? "(inverted)" : "(normal)"}
              </Button>
            ),
          )}
        </div>
      </div>

      {/* Default speeds */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Default Speeds</div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full h-12 justify-between px-4"
            onClick={() => setKeypad({ field: "xy", current: xySpeed })}
          >
            <span className="text-sm text-muted-foreground">XY Speed</span>
            <span className="text-sm font-medium tabular-nums">{xySpeed} mm/s</span>
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 justify-between px-4"
            onClick={() => setKeypad({ field: "z", current: zSpeed })}
          >
            <span className="text-sm text-muted-foreground">Z Speed</span>
            <span className="text-sm font-medium tabular-nums">{zSpeed} mm/s</span>
          </Button>
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

/* ── Main controls ───────────────────────────────────── */

export function MovementSection({ mode }: { mode: SectionMode }) {
  const { send, busy } = useGcode();
  const [stepSize, setStepSize] = useState(10);

  const loaded = useMovementStore((s) => s.loaded);
  const loadFromConfig = useMovementStore((s) => s.loadFromConfig);

  useEffect(() => {
    if (!loaded) loadFromConfig();
  }, [loaded, loadFromConfig]);

  const pos = usePrinterStore((s) => s.toolhead.position);
  const homedAxes = usePrinterStore((s) => s.toolhead.homed_axes);
  const beaconDist = useBeaconLive();

  const xHomed = homedAxes.includes("x");
  const yHomed = homedAxes.includes("y");
  const zHomed = homedAxes.includes("z");
  const allHomed = xHomed && yHomed && zHomed;

  const invertX = useMovementStore((s) => s.invertX);
  const invertY = useMovementStore((s) => s.invertY);
  const invertZ = useMovementStore((s) => s.invertZ);
  const xySpeed = useMovementStore((s) => s.defaultXySpeed);
  const zSpeed = useMovementStore((s) => s.defaultZSpeed);

  if (mode === "settings") return <MovementSettings />;

  const xDir = invertX ? -1 : 1;
  const yDir = invertY ? -1 : 1;
  const zDir = invertZ ? -1 : 1;

  const moveXY = (axis: string, dir: number) => {
    const f = xySpeed * 60;
    send(`G91\nG1 ${axis}${dir * stepSize} F${f}\nG90`);
  };
  const moveZ = (dir: number) => {
    const f = zSpeed * 60;
    send(`G91\nG1 Z${dir * stepSize} F${f}\nG90`);
  };

  const jogBtn = "h-14 w-14 landscape:h-16 landscape:w-16 rounded-xl text-base";

  return (
    <div className="space-y-3 landscape:space-y-4">
      {/* Position readout */}
      <div className={`grid gap-2 ${beaconDist != null ? "grid-cols-4" : "grid-cols-3"}`}>
        {(["X", "Y", "Z"] as const).map((axis, i) => {
          const homed = homedAxes.includes(axis.toLowerCase());
          return (
            <div key={axis} className="rounded-lg border border-border px-3 py-1.5 landscape:py-2 bg-card">
              <div className="text-[10px] text-muted-foreground">{axis}</div>
              <div className={`text-sm font-semibold tabular-nums ${homed ? "" : "text-muted-foreground"}`}>
                {homed ? pos[i].toFixed(2) : "?"}
              </div>
            </div>
          );
        })}
        {beaconDist != null && (
          <div className="rounded-lg border border-primary/30 px-3 py-1.5 landscape:py-2 bg-card">
            <div className="text-[10px] text-muted-foreground">Probe</div>
            <div className="text-sm font-semibold tabular-nums">{beaconDist.toFixed(3)}</div>
          </div>
        )}
      </div>

      {/* Step size — above jog pad in portrait, beside in landscape */}
      <div className="landscape:hidden">
        <div className="text-[11px] text-muted-foreground mb-1">Step (mm)</div>
        <div className="grid grid-cols-4 gap-1">
          {STEP_SIZES.map((s) => (
            <Button key={s} variant={stepSize === s ? "default" : "outline"} className="h-10 text-xs px-0" onClick={() => setStepSize(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Landscape: side-by-side. Portrait: jog pad centered, actions below */}
      <div className="flex flex-col landscape:flex-row gap-3 landscape:gap-4">
        {/* Jog pad: XY cross + Z */}
        <div className="flex gap-3 justify-center landscape:justify-start shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", yDir)}>
              <ArrowUp size={20} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", -xDir)}>
              <ArrowLeft size={20} />
            </Button>
            <div className="flex items-center justify-center text-xs text-muted-foreground font-medium">
              XY
            </div>
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("X", xDir)}>
              <ArrowRight size={20} />
            </Button>
            <div />
            <Button variant="outline" className={jogBtn} onClick={() => moveXY("Y", -yDir)}>
              <ArrowDown size={20} />
            </Button>
            <div />
          </div>

          <div className="flex flex-col items-center gap-1.5 w-14 landscape:w-16">
            <Button variant="outline" className="h-14 landscape:h-16 w-full rounded-xl" onClick={() => moveZ(zDir)}>
              <ChevronUp size={20} />
            </Button>
            <div className="text-center py-0.5 landscape:py-1">
              <div className="text-[10px] text-muted-foreground">Z</div>
              <div className="text-xs font-semibold tabular-nums">{pos[2].toFixed(2)}</div>
            </div>
            <Button variant="outline" className="h-14 landscape:h-16 w-full rounded-xl" onClick={() => moveZ(-zDir)}>
              <ChevronDown size={20} />
            </Button>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Step size — landscape only (shown above in portrait) */}
          <div className="hidden landscape:block">
            <div className="text-[11px] text-muted-foreground mb-1">Step (mm)</div>
            <div className="grid grid-cols-4 gap-1">
              {STEP_SIZES.map((s) => (
                <Button key={s} variant={stepSize === s ? "default" : "outline"} className="h-10 text-xs px-0" onClick={() => setStepSize(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Homing</div>
            <div className="grid grid-cols-4 gap-1">
              <Button variant={allHomed ? "secondary" : "default"} className="h-10 text-xs" disabled={busy} onClick={() => send("G28")}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Home size={14} />}
                All
              </Button>
              <Button variant={xHomed ? "secondary" : "outline"} className="h-10 text-xs" disabled={busy} onClick={() => send("G28 X")}>X</Button>
              <Button variant={yHomed ? "secondary" : "outline"} className="h-10 text-xs" disabled={busy} onClick={() => send("G28 Y")}>Y</Button>
              <Button variant={zHomed ? "secondary" : "outline"} className="h-10 text-xs" disabled={busy} onClick={() => send("G28 Z")}>Z</Button>
            </div>
          </div>

          {/* Speed info */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-card">
              <div className="text-[10px] text-muted-foreground">XY Speed</div>
              <div className="text-xs font-medium tabular-nums">{xySpeed} mm/s</div>
            </div>
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-card">
              <div className="text-[10px] text-muted-foreground">Z Speed</div>
              <div className="text-xs font-medium tabular-nums">{zSpeed} mm/s</div>
            </div>
          </div>

          <Button variant="outline" className="w-full h-10 text-xs text-destructive" onClick={() => send("M84")}>
            <Power size={14} />
            Disable Motors
          </Button>
        </div>
      </div>
    </div>
  );
}
