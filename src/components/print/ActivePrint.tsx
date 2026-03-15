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
import { Slider } from "@/components/ui/slider";
import {
  Pause, Play, X, Loader2,
  Minus, Plus, Settings, Eye,
  Fan, Ban,
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
  const [tab, setTab] = useState<"overview" | "adjust">("overview");

  const stats = usePrintStore((s) => s.print_stats);
  const progress = usePrintStore((s) => s.display_status.progress);
  const thumbnailUrl = usePrintStore((s) => s.thumbnailUrl);

  const pct = Math.round(progress * 100);
  const elapsed = stats.print_duration;
  const remaining = progress > 0 ? elapsed / progress - elapsed : 0;
  const layer = stats.info?.current_layer && stats.info?.total_layer
    ? `${stats.info.current_layer} / ${stats.info.total_layer}`
    : "--";

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
      {/* Header: thumbnail + progress */}
      <div className="flex gap-3 p-3 pb-2 shrink-0">
        <div className="w-28 h-28 shrink-0 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="text-muted-foreground text-xs">No preview</div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="text-sm font-medium truncate">{stats.filename || "Unknown"}</div>
            <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            <MiniStat label="Elapsed" value={fmtDur(elapsed)} />
            <MiniStat label="Remain" value={fmtDur(remaining)} />
            <MiniStat label="ETA" value={fmtEta(remaining)} />
            <MiniStat label="Layer" value={layer} />
          </div>
        </div>
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
        {tab === "overview" ? <OverviewTab /> : <AdjustTab />}
      </div>

      {/* Sticky bottom tabs */}
      <div className="flex gap-2 px-3 py-2 shrink-0 border-t border-border">
        <BottomTab active={tab === "overview"} icon={<Eye size={18} />} label="Overview" onTap={() => setTab("overview")} />
        <BottomTab active={tab === "adjust"} icon={<Settings size={18} />} label="Adjust" onTap={() => setTab("adjust")} />
      </div>
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────── */

function OverviewTab() {
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
  const isPaused = usePrintStore((s) => s.print_stats.state) === "paused";
  const showConfirm = useUiStore((s) => s.showConfirm);
  const { busy } = useGcode();

  const filamentArea = Math.PI * (1.75 / 2) ** 2;
  const flowRate = Math.abs(extruderVelocity) * filamentArea;

  return (
    <div className="space-y-2">
      {/* 2 cards side by side */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard>
          <CardHeader>Temperatures</CardHeader>
          <Row label="Hotend" value={`${extruder.temperature.toFixed(0)}° / ${extruder.target}°`} />
          <Row label="Bed" value={`${bed.temperature.toFixed(0)}° / ${bed.target}°`} />
        </InfoCard>
        <InfoCard>
          <CardHeader>Motion</CardHeader>
          <Row label="Velocity" value={`${liveVelocity.toFixed(0)} mm/s`} />
          <Row label="Accel" value={`${maxAccel.toFixed(0)} mm/s²`} />
          <Row label="SCV" value={`${sqCornerVel.toFixed(1)} mm/s`} />
          <Row label="Z Pos" value={`${zPos.toFixed(2)} mm`} />
          <Row label="Fan" value={`${Math.round(fanSpeed * 100)}%`} />
        </InfoCard>
      </div>

      {/* Thin full-width card */}
      <div className="bg-card border border-border rounded-lg px-3 py-1.5 flex items-center justify-between gap-3">
        <Chip label="Flow" value={`${flowRate.toFixed(1)} mm³/s`} />
        <Sep />
        <Chip label="Filament" value={`${(filamentUsed / 1000).toFixed(2)} m`} />
        <Sep />
        <Chip label="Speed" value={`${Math.round(speedFactor * 100)}%`} />
        <Sep />
        <Chip label="Extrude" value={`${Math.round(extrudeFactor * 100)}%`} />
      </div>

      {/* Pause / Cancel */}
      <div className="grid grid-cols-2 gap-2">
        {isPaused ? (
          <button onClick={resumePrint}
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-95">
            <Play size={18} /> Resume
          </button>
        ) : (
          <button onClick={pausePrint} disabled={busy}
            className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-secondary text-secondary-foreground border border-border text-sm font-medium active:scale-95">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Pause size={18} />}
            Pause
          </button>
        )}
        <button
          onClick={() => showConfirm({
            title: "Cancel Print",
            message: "Are you sure you want to cancel the current print?",
            onConfirm: cancelPrint,
          })}
          className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium active:scale-95">
          <X size={18} /> Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Adjust Tab ───────────────────────────────────────── */

function AdjustTab() {
  const { extruder, bed } = useTemperature();
  const speedFactor = usePrinterStore((s) => s.gcode_move.speed_factor);
  const extrudeFactor = usePrinterStore((s) => s.gcode_move.extrude_factor);
  const zPos = usePrinterStore((s) => s.toolhead.position[2]);
  const fanSpeed = usePrinterStore((s) => s.fans["fan"]?.speed ?? 0);
  const excludeObj = usePrinterStore((s) => s.excludeObject);
  const showConfirm = useUiStore((s) => s.showConfirm);
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

  return (
    <div className="space-y-3">
      {/* Temperatures — tap to type exact value */}
      <div className="grid grid-cols-2 gap-2">
        <TempBtn
          label="Hotend" current={extruder.temperature} target={extruder.target}
          onTap={() => setKeypadTarget({ title: "Hotend Temp", value: extruder.target, min: 0, max: 300, unit: "°C",
            onSubmit: (v) => { setTemperature("extruder", v); setKeypadTarget(null); } })}
        />
        <TempBtn
          label="Bed" current={bed.temperature} target={bed.target}
          onTap={() => setKeypadTarget({ title: "Bed Temp", value: bed.target, min: 0, max: 120, unit: "°C",
            onSubmit: (v) => { setTemperature("heater_bed", v); setKeypadTarget(null); } })}
        />
      </div>

      {/* Fan control */}
      <div className="bg-card border border-border rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Fan size={14} className={fanPct > 0 ? "text-cyan-500 animate-spin" : "text-muted-foreground"}
              style={fanPct > 0 ? { animationDuration: `${Math.max(0.3, 2 - fanPct / 60)}s` } : undefined} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Part Fan</span>
          </div>
          <span className="text-sm font-bold tabular-nums">{localFanPct ?? fanPct}%</span>
        </div>
        <Slider
          min={0} max={100} step={1}
          value={[localFanPct ?? fanPct]}
          onValueChange={([v]) => setLocalFanPct(v)}
          onValueCommit={([v]) => { setLocalFanPct(null); setFanSpeed(v / 100); }}
          className="py-1"
        />
        <div className="flex gap-1.5 mt-2">
          {[0, 25, 50, 75, 100].map((p) => (
            <button key={p} onClick={() => { setLocalFanPct(null); setFanSpeed(p / 100); }}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${
                fanPct === p ? "bg-primary text-primary-foreground" : "bg-secondary border border-border text-secondary-foreground"
              } active:scale-95`}>
              {p === 0 ? "Off" : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Speed — +/- step buttons */}
      <PctAdjust
        label="Print Speed"
        value={speedPct}
        onStep={(delta) => send(`M220 S${Math.max(10, Math.min(300, speedPct + delta))}`)}
      />

      {/* Extrusion rate — +/- step buttons */}
      <PctAdjust
        label="Extrusion Rate"
        value={extrudePct}
        onStep={(delta) => send(`M221 S${Math.max(50, Math.min(200, extrudePct + delta))}`)}
      />

      {/* Z baby-stepping */}
      <div className="bg-card border border-border rounded-lg px-2 py-2.5">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1.5">Z Offset</div>
        <div className="flex items-center gap-2">
          <StepBtn label="-0.05" onTap={() => babyStep(-0.05)} />
          <StepBtn label="-0.01" onTap={() => babyStep(-0.01)} />
          <div className="flex-1 text-center">
            <div className="text-lg font-bold tabular-nums">{zPos.toFixed(2)} mm</div>
          </div>
          <StepBtn label="+0.01" onTap={() => babyStep(0.01)} />
          <StepBtn label="+0.05" onTap={() => babyStep(0.05)} />
        </div>
      </div>

      {/* Exclude Object */}
      {hasObjects && (
        <div className="bg-card border border-border rounded-lg px-3 py-2.5">
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
                <div key={obj.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/50">
                  <span className={`text-xs truncate flex-1 mr-2 ${isExcluded ? "line-through text-muted-foreground" : ""}`}>
                    {obj.name}
                  </span>
                  {isExcluded ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">Excluded</span>
                  ) : (
                    <button
                      onClick={() => showConfirm({
                        title: "Exclude Object",
                        message: `Stop printing "${obj.name}"? This cannot be undone.`,
                        onConfirm: () => excludeObject(obj.name),
                      })}
                      className="text-[10px] text-destructive font-medium shrink-0 px-2 py-1 rounded bg-destructive/10 active:scale-95">
                      Exclude
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {keypadTarget && (
        <NumericKeypad title={keypadTarget.title} initialValue={keypadTarget.value}
          unit={keypadTarget.unit} min={keypadTarget.min} max={keypadTarget.max}
          onSubmit={keypadTarget.onSubmit} onCancel={() => setKeypadTarget(null)} />
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="text-[11px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-lg px-3 py-2">{children}</div>;
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

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center flex-1">
      <div className="text-[9px] text-muted-foreground leading-none">{label}</div>
      <div className="text-[11px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border shrink-0" />;
}

function BottomTab({ active, icon, label, onTap }: {
  active: boolean; icon: React.ReactNode; label: string; onTap: () => void;
}) {
  return (
    <button onClick={onTap}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
      }`}>
      {icon} {label}
    </button>
  );
}

function TempBtn({ label, current, target, onTap }: {
  label: string; current: number; target: number; onTap: () => void;
}) {
  return (
    <button onClick={onTap}
      className="flex flex-col items-center gap-1 bg-card border border-border rounded-lg py-3 active:scale-[0.97]">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold tabular-nums">{current.toFixed(0)}°<span className="text-muted-foreground font-normal text-sm"> / {target}°</span></span>
      <span className="text-[10px] text-primary">Tap to set</span>
    </button>
  );
}

function PctAdjust({ label, value, onStep }: {
  label: string; value: number; onStep: (delta: number) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-2.5">
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
    </div>
  );
}

function PctBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button onClick={onTap}
      className="flex items-center justify-center gap-0.5 min-w-[48px] py-2.5 rounded-lg bg-secondary border border-border text-sm font-medium tabular-nums active:scale-95">
      {label.startsWith("-") ? <Minus size={12} /> : <Plus size={12} />}
      {label.replace(/^[+-]/, "")}
    </button>
  );
}

function StepBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button onClick={onTap}
      className="flex items-center gap-0.5 px-3 py-2.5 rounded-lg bg-secondary border border-border text-xs font-medium tabular-nums active:scale-95">
      {label.startsWith("-") ? <Minus size={10} /> : <Plus size={10} />}
      {label.replace(/^[+-]/, "")}
    </button>
  );
}
