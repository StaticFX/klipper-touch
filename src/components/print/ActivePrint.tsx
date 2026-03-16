import { useState, useEffect, useRef } from "react";
import { usePrintStore } from "@/stores/print-store";
import { usePrinterStore } from "@/stores/printer-store";
import { useTemperature } from "@/hooks/use-temperature";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";
import {
  pausePrint, resumePrint, cancelPrint,
  getFileMetadata, getThumbnailUrl, setTemperature,
  setFanSpeed, excludeObject,
} from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Pause, Play, X, Loader2,
  Minus, Plus, Info, Sliders,
  Fan, Ban, Home,
} from "lucide-react";

/* ── Helpers ──────────────────────────────────────────── */

function fmtDur(s: number): string {
  if (!s || !isFinite(s)) return "--:--";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtEta(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "--:--";
  const eta = new Date(Date.now() + seconds * 1000);
  return `${String(eta.getHours()).padStart(2, "0")}:${String(eta.getMinutes()).padStart(2, "0")}`;
}

/* ── Main ─────────────────────────────────────────────── */

export function ActivePrint() {
  const [tab, setTab] = useState<"print" | "details" | "adjust">("print");

  const stats = usePrintStore((s) => s.print_stats);
  const thumbnailUrl = usePrintStore((s) => s.thumbnailUrl);

  const lastFile = useRef("");
  useEffect(() => {
    const fn = stats.filename;
    if (!fn || fn === lastFile.current) return;
    lastFile.current = fn;
    getFileMetadata(fn)
      .then((meta) => {
        const best = meta.thumbnails?.sort((a, b) => b.width - a.width)[0];
        usePrintStore.getState().setThumbnailUrl(
          best ? getThumbnailUrl(fn, best.relative_path) : null
        );
      })
      .catch(() => usePrintStore.getState().setThumbnailUrl(null));
  }, [stats.filename]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "print" && <PrintTab filename={stats.filename} thumbnailUrl={thumbnailUrl} />}
        {tab === "details" && <DetailsTab />}
        {tab === "adjust" && <AdjustTab />}
      </div>

      {/* Bottom tabs */}
      <div className="flex gap-2 px-3 py-2 shrink-0 border-t border-border">
        <TabBtn active={tab === "print"} label="Print" onTap={() => setTab("print")} />
        <TabBtn active={tab === "details"} icon={<Info size={16} />} label="Details" onTap={() => setTab("details")} />
        <TabBtn active={tab === "adjust"} icon={<Sliders size={16} />} label="Adjust" onTap={() => setTab("adjust")} />
      </div>
    </div>
  );
}

/* ── Print Tab — Horizontal layout ────────────────────── */

function PrintTab({ filename, thumbnailUrl }: { filename: string; thumbnailUrl: string | null }) {
  const progress = usePrintStore((s) => s.display_status.progress);
  const elapsed = usePrintStore((s) => s.print_stats.print_duration);
  const stats = usePrintStore((s) => s.print_stats);
  const isPaused = stats.state === "paused";
  const showConfirm = useUiStore((s) => s.showConfirm);
  const { busy } = useGcode();

  const pct = Math.round(progress * 100);
  const remaining = progress > 0 ? elapsed / progress - elapsed : 0;
  const layer = stats.info?.current_layer && stats.info?.total_layer
    ? `${stats.info.current_layer} / ${stats.info.total_layer}` : null;

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Top: thumbnail + stats side by side */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Thumbnail */}
        <div className="shrink-0 aspect-square h-full max-h-[200px] rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center self-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="text-muted-foreground text-xs px-4">No preview</div>
          )}
        </div>

        {/* Stats */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {(filename || "Unknown").split("/").pop()}
          </div>

          <div className="text-4xl font-bold tabular-nums tracking-tight">{pct}%</div>

          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
            <StatLabel label="Elapsed" value={fmtDur(elapsed)} />
            <StatLabel label="Remaining" value={fmtDur(remaining)} />
            <StatLabel label="ETA" value={fmtEta(remaining)} />
            {layer && <StatLabel label="Layer" value={layer} />}
          </div>
        </div>
      </div>

      {/* Bottom: controls */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {isPaused ? (
          <Button className="h-12" onClick={resumePrint}>
            <Play size={18} /> Resume
          </Button>
        ) : (
          <Button variant="secondary" className="h-12" onClick={pausePrint} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Pause size={18} />}
            Pause
          </Button>
        )}
        <Button
          variant="destructive-subtle" className="h-12"
          onClick={() => showConfirm({
            title: "Cancel Print",
            message: "Are you sure you want to cancel the current print?",
            onConfirm: cancelPrint,
          })}
        >
          <X size={18} /> Cancel
        </Button>
      </div>
    </div>
  );
}

function StatLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* ── Details Tab ──────────────────────────────────────── */

function DetailsTab() {
  const { extruder, bed } = useTemperature();
  const speedFactor = usePrinterStore((s) => s.gcode_move.speed_factor);
  const extrudeFactor = usePrinterStore((s) => s.gcode_move.extrude_factor);
  const extruderVelocity = usePrinterStore((s) => s.motionReport.live_extruder_velocity);
  const liveVelocity = usePrinterStore((s) => s.motionReport.live_velocity);
  const maxAccel = usePrinterStore((s) => s.toolhead.max_accel);
  const sqCornerVel = usePrinterStore((s) => s.toolhead.square_corner_velocity);
  const zPos = usePrinterStore((s) => s.toolhead.position[2]);
  const fanSpeed = usePrinterStore((s) => s.fans["fan"]?.speed ?? 0);
  const filamentUsed = usePrintStore((s) => s.print_stats.filament_used);
  const stats = usePrintStore((s) => s.print_stats);
  const progress = usePrintStore((s) => s.display_status.progress);

  const elapsed = stats.print_duration;
  const remaining = progress > 0 ? elapsed / progress - elapsed : 0;
  const layer = stats.info?.current_layer && stats.info?.total_layer
    ? `${stats.info.current_layer} / ${stats.info.total_layer}` : "--";

  const filamentArea = Math.PI * (1.75 / 2) ** 2;
  const flowRate = Math.abs(extruderVelocity) * filamentArea;

  return (
    <div className="p-4 space-y-2">
      <Card>
        <CardHeader>Time</CardHeader>
        <Row label="Elapsed" value={fmtDur(elapsed)} />
        <Row label="Remaining" value={fmtDur(remaining)} />
        <Row label="ETA" value={fmtEta(remaining)} />
        <Row label="Layer" value={layer} />
      </Card>
      <Card>
        <CardHeader>Temperatures</CardHeader>
        <Row label="Hotend" value={`${extruder.temperature.toFixed(0)}° / ${extruder.target}°`} />
        <Row label="Bed" value={`${bed.temperature.toFixed(0)}° / ${bed.target}°`} />
      </Card>
      <Card>
        <CardHeader>Motion</CardHeader>
        <Row label="Velocity" value={`${liveVelocity.toFixed(0)} mm/s`} />
        <Row label="Accel" value={`${maxAccel.toFixed(0)} mm/s²`} />
        <Row label="SCV" value={`${sqCornerVel.toFixed(1)} mm/s`} />
        <Row label="Z Position" value={`${zPos.toFixed(2)} mm`} />
      </Card>
      <Card>
        <CardHeader>Stats</CardHeader>
        <Row label="Flow" value={`${flowRate.toFixed(1)} mm³/s`} />
        <Row label="Filament" value={`${(filamentUsed / 1000).toFixed(2)} m`} />
        <Row label="Fan" value={`${Math.round(fanSpeed * 100)}%`} />
        <Row label="Speed Factor" value={`${Math.round(speedFactor * 100)}%`} />
        <Row label="Extrude Factor" value={`${Math.round(extrudeFactor * 100)}%`} />
      </Card>
    </div>
  );
}

/* ── Adjust Tab ───────────────────────────────────────── */

function AdjustTab() {
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
      {/* Z baby-stepping — first, most critical during print */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1.5">Z Offset</div>
        <div className="flex items-center gap-2">
          <StepBtn label="-0.05" onTap={() => babyStep(-0.05)} />
          <StepBtn label="-0.01" onTap={() => babyStep(-0.01)} />
          <div className="flex-1 text-center">
            <div className="text-lg font-bold tabular-nums">{zOffset >= 0 ? "+" : ""}{zOffset.toFixed(3)} mm</div>
          </div>
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
        <div className="flex gap-1.5 mt-2">
          {[0, 25, 50, 75, 100].map((p) => (
            <Button key={p} variant={fanPct === p ? "default" : "secondary"} size="xs"
              className="flex-1" onClick={() => { setLocalFanPct(null); setFanSpeed(p / 100); }}>
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

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-px">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function TabBtn({ active, icon, label, onTap }: {
  active: boolean; icon?: React.ReactNode; label: string; onTap: () => void;
}) {
  return (
    <Button variant={active ? "default" : "secondary"} className="flex-1 h-11" onClick={onTap}>
      {icon} {label}
    </Button>
  );
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
      <div className="flex items-center gap-2">
        <PctBtn label="-10" onTap={() => onStep(-10)} />
        <PctBtn label="-5" onTap={() => onStep(-5)} />
        <div className="flex-1 text-center">
          <div className="text-lg font-bold tabular-nums">{value}%</div>
        </div>
        <PctBtn label="+5" onTap={() => onStep(5)} />
        <PctBtn label="+10" onTap={() => onStep(10)} />
      </div>
    </Card>
  );
}

function PctBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <Button variant="secondary" size="sm" className="min-w-[48px] tabular-nums" onClick={onTap}>
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
