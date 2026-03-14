import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { setFanSpeed, setGenericFanSpeed } from "@/lib/moonraker/client";
import { usePrinterStore, type FanInfo } from "@/stores/printer-store";
import { Fan } from "lucide-react";

/** Determine the display name and controllability of a fan object. */
function fanMeta(key: string): { label: string; controllable: boolean; type: string } {
  if (key === "fan") return { label: "Part Cooling", controllable: true, type: "fan" };
  if (key.startsWith("fan_generic "))
    return { label: key.replace("fan_generic ", ""), controllable: true, type: "fan_generic" };
  if (key.startsWith("heater_fan "))
    return { label: key.replace("heater_fan ", ""), controllable: false, type: "heater_fan" };
  if (key.startsWith("controller_fan "))
    return { label: key.replace("controller_fan ", ""), controllable: false, type: "controller_fan" };
  if (key.startsWith("temperature_fan "))
    return { label: key.replace("temperature_fan ", ""), controllable: false, type: "temperature_fan" };
  return { label: key, controllable: false, type: "unknown" };
}

export function FanSection() {
  const fans = usePrinterStore((s) => s.fans);
  const entries = Object.entries(fans).sort((a, b) => {
    // Part cooling fan first, then controllable, then the rest
    if (a[0] === "fan") return -1;
    if (b[0] === "fan") return 1;
    const am = fanMeta(a[0]);
    const bm = fanMeta(b[0]);
    if (am.controllable !== bm.controllable) return am.controllable ? -1 : 1;
    return am.label.localeCompare(bm.label);
  });

  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">No fans detected</div>;
  }

  return (
    <div className="space-y-5">
      {entries.map(([key, info]) => (
        <FanRow key={key} fanKey={key} info={info} />
      ))}
    </div>
  );
}

function FanRow({ fanKey, info }: { fanKey: string; info: FanInfo }) {
  const meta = fanMeta(fanKey);
  const pct = Math.round(info.speed * 100);

  const applySpeed = useCallback(
    (percent: number) => {
      const speed01 = percent / 100;
      if (fanKey === "fan") {
        setFanSpeed(speed01);
      } else if (meta.type === "fan_generic") {
        const name = fanKey.replace("fan_generic ", "");
        setGenericFanSpeed(name, speed01);
      }
    },
    [fanKey, meta.type]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Fan
            size={14}
            className={pct > 0 ? "text-cyan-500 animate-spin" : "text-muted-foreground"}
            style={pct > 0 ? { animationDuration: `${Math.max(0.3, 2 - pct / 60)}s` } : undefined}
          />
          <span className="text-sm font-medium truncate">{meta.label}</span>
          {!meta.controllable && (
            <span className="text-[10px] text-muted-foreground">(auto)</span>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums w-12 text-right">{pct}%</span>
      </div>

      {meta.controllable ? (
        <>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[pct]}
            onValueCommit={([v]) => applySpeed(v)}
            className="py-2"
          />
          <div className="flex gap-1.5">
            {[0, 25, 50, 75, 100].map((p) => (
              <Button
                key={p}
                variant={pct === p ? "default" : "outline"}
                className="flex-1 h-10 text-xs"
                onClick={() => applySpeed(p)}
              >
                {p === 0 ? "Off" : `${p}%`}
              </Button>
            ))}
          </div>
        </>
      ) : (
        /* Read-only progress bar for automatic fans */
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-cyan-500/60 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {info.rpm != null && (
        <div className="text-[10px] text-muted-foreground">{info.rpm} RPM</div>
      )}
    </div>
  );
}
