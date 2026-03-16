import { useState } from "react";
import { useTemperature } from "@/hooks/use-temperature";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { useGcode } from "@/hooks/use-gcode";
import { setTemperature, setFanSpeed, excludeObject } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Minus, Plus, Fan, Ban, Home } from "lucide-react";

export function AdjustTab() {
  const { extruder, bed } = useTemperature();
  const speedFactor = usePrinterStore((s) => s.gcode_move.speed_factor);
  const extrudeFactor = usePrinterStore((s) => s.gcode_move.extrude_factor);
  const zOffset = usePrinterStore((s) => s.gcode_move.homing_origin[2]);
  const fanSpeed = usePrinterStore((s) => s.fans["fan"]?.speed ?? 0);
  const excludeObj = usePrinterStore((s) => s.excludeObject);
  const showConfirm = useUiStore((s) => s.showConfirm);
  const setPrintMinimized = useUiStore((s) => s.setPrintMinimized);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { send } = useGcode();

  const [keypadTarget, setKeypadTarget] = useState<{
    title: string; value: number; min: number; max: number; unit: string;
    onSubmit: (v: number) => void;
  } | null>(null);

  const babyStep = (mm: number) => send(`SET_GCODE_OFFSET Z_ADJUST=${mm} MOVE=1`);
  const speedPct = Math.round(speedFactor * 100);
  const extrudePct = Math.round(extrudeFactor * 100);
  const fanPct = Math.round(fanSpeed * 100);
  const [localFanPct, setLocalFanPct] = useState<number | null>(null);
  const hasObjects = excludeObj.objects.length > 0;

  const goToMenu = () => {
    setPrintMinimized(true);
    setActiveTab("dashboard");
  };

  return (
    <div className="p-4 space-y-3">
      {/* Z baby-stepping */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1.5">Z Offset</div>
        <div className="text-center mb-2">
          <div className="text-lg font-bold tabular-nums">{zOffset >= 0 ? "+" : ""}{zOffset.toFixed(3)} mm</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <StepBtn label="-0.05" onTap={() => babyStep(-0.05)} />
          <StepBtn label="-0.01" onTap={() => babyStep(-0.01)} />
          <StepBtn label="+0.01" onTap={() => babyStep(0.01)} />
          <StepBtn label="+0.05" onTap={() => babyStep(0.05)} />
        </div>
      </Card>

      {/* Temperatures */}
      <div className="grid grid-cols-2 gap-2">
        <TempBtn label="Hotend" current={extruder.temperature} target={extruder.target}
          onTap={() => setKeypadTarget({ title: "Hotend Temp", value: extruder.target, min: 0, max: 300, unit: "°C",
            onSubmit: (v) => { setTemperature("extruder", v); setKeypadTarget(null); } })} />
        <TempBtn label="Bed" current={bed.temperature} target={bed.target}
          onTap={() => setKeypadTarget({ title: "Bed Temp", value: bed.target, min: 0, max: 120, unit: "°C",
            onSubmit: (v) => { setTemperature("heater_bed", v); setKeypadTarget(null); } })} />
      </div>

      {/* Fan */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Fan size={14} className={fanPct > 0 ? "text-cyan-500 animate-spin" : "text-muted-foreground"}
              style={fanPct > 0 ? { animationDuration: `${Math.max(0.3, 2 - fanPct / 60)}s` } : undefined} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Part Fan</span>
          </div>
          <span className="text-sm font-bold tabular-nums">{localFanPct ?? fanPct}%</span>
        </div>
        <Slider min={0} max={100} step={1}
          value={[localFanPct ?? fanPct]}
          onValueChange={([v]) => setLocalFanPct(v)}
          onValueCommit={([v]) => { setLocalFanPct(null); setFanSpeed(v / 100); }}
          className="py-1" />
        <div className="grid grid-cols-3 landscape:flex gap-1.5 mt-2">
          {[0, 25, 50, 75, 100].map((p) => (
            <Button key={p} variant={fanPct === p ? "default" : "secondary"} size="xs"
              className="landscape:flex-1" onClick={() => { setLocalFanPct(null); setFanSpeed(p / 100); }}>
              {p === 0 ? "Off" : `${p}%`}
            </Button>
          ))}
        </div>
      </Card>

      <PctAdjust label="Print Speed" value={speedPct}
        onStep={(delta) => send(`M220 S${Math.max(10, Math.min(300, speedPct + delta))}`)} />
      <PctAdjust label="Extrusion Rate" value={extrudePct}
        onStep={(delta) => send(`M221 S${Math.max(50, Math.min(200, extrudePct + delta))}`)} />

      {/* Exclude Object */}
      {hasObjects && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Ban size={14} className="text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Exclude Object</span>
          </div>
          {excludeObj.current_object && (
            <div className="text-[11px] text-muted-foreground mb-2">
              Printing: <span className="text-foreground font-medium">{excludeObj.current_object}</span>
            </div>
          )}
          <div className="space-y-1">
            {excludeObj.objects.map((obj) => {
              const isExcluded = excludeObj.excluded_objects.includes(obj.name);
              return (
                <div key={obj.name} className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-muted/50">
                  <span className={`text-xs truncate flex-1 mr-2 ${isExcluded ? "line-through text-muted-foreground" : ""}`}>
                    {obj.name}
                  </span>
                  {isExcluded ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">Excluded</span>
                  ) : (
                    <Button variant="destructive-subtle" size="xs"
                      onClick={() => showConfirm({
                        title: "Exclude Object",
                        message: `Stop printing "${obj.name}"? This cannot be undone.`,
                        onConfirm: () => excludeObject(obj.name),
                      })}>
                      Exclude
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Back to menu */}
      <Button variant="outline" className="w-full h-12" onClick={goToMenu}>
        <Home size={16} /> Back to Menu
      </Button>

      {keypadTarget && (
        <NumericKeypad title={keypadTarget.title} initialValue={keypadTarget.value}
          unit={keypadTarget.unit} min={keypadTarget.min} max={keypadTarget.max}
          onSubmit={keypadTarget.onSubmit} onCancel={() => setKeypadTarget(null)} />
      )}
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl px-3 py-2.5">{children}</div>;
}

function TempBtn({ label, current, target, onTap }: {
  label: string; current: number; target: number; onTap: () => void;
}) {
  return (
    <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onTap}>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold tabular-nums">{current.toFixed(0)}°<span className="text-muted-foreground font-normal text-sm"> / {target}°</span></span>
      <span className="text-[10px] text-primary">Tap to set</span>
    </Button>
  );
}

function PctAdjust({ label, value, onStep }: {
  label: string; value: number; onStep: (delta: number) => void;
}) {
  return (
    <Card>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1.5">{label}</div>
      <div className="text-center mb-2">
        <div className="text-lg font-bold tabular-nums">{value}%</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <PctBtn label="-10" onTap={() => onStep(-10)} />
        <PctBtn label="-5" onTap={() => onStep(-5)} />
        <PctBtn label="+5" onTap={() => onStep(5)} />
        <PctBtn label="+10" onTap={() => onStep(10)} />
      </div>
    </Card>
  );
}

function PctBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <Button variant="secondary" size="sm" className="tabular-nums" onClick={onTap}>
      {label.startsWith("-") ? <Minus size={12} /> : <Plus size={12} />}
      {label.replace(/^[+-]/, "")}
    </Button>
  );
}

function StepBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <Button variant="secondary" size="xs" className="tabular-nums" onClick={onTap}>
      {label.startsWith("-") ? <Minus size={10} /> : <Plus size={10} />}
      {label.replace(/^[+-]/, "")}
    </Button>
  );
}
