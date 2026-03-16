import { useTemperature } from "@/hooks/use-temperature";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";

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

export function DetailsTab() {
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
