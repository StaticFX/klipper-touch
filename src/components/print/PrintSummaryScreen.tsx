import { usePrintStore, type PrintSummary } from "@/stores/print-store";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock, Timer, Layers, Ruler } from "lucide-react";

function fmtDur(s: number): string {
  if (!s || !isFinite(s)) return "--:--";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, label: "Print Complete", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
  cancelled: { icon: XCircle, label: "Print Cancelled", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  error: { icon: AlertCircle, label: "Print Failed", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
} as const;

export function PrintSummaryScreen({ summary }: { summary: PrintSummary }) {
  const dismiss = usePrintStore((s) => s.dismissSummary);
  const cfg = STATUS_CONFIG[summary.state];
  const Icon = cfg.icon;
  const filamentMeters = (summary.filament_used / 1000).toFixed(2);

  return (
    <div className="flex items-center justify-center h-full p-3">
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {/* Status badge */}
        <div className="flex items-center gap-2 justify-center">
          <div className={`p-1.5 rounded-full ${cfg.bg} ${cfg.border} border`}>
            <Icon size={20} className={cfg.color} />
          </div>
          <div className={`text-base font-semibold ${cfg.color}`}>{cfg.label}</div>
        </div>

        {/* Portrait: stack vertically. Landscape: side by side */}
        <div className="flex flex-col landscape:flex-row gap-3">
          {/* Thumbnail + filename */}
          <div className="flex landscape:flex-col items-center gap-3 landscape:shrink-0">
            <div className="w-24 h-24 landscape:w-32 landscape:h-32 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
              {summary.thumbnailUrl ? (
                <img src={summary.thumbnailUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <Icon size={32} className="text-muted-foreground/30" />
              )}
            </div>
            <div className="text-sm font-medium truncate landscape:text-center min-w-0 flex-1 landscape:flex-none">
              {summary.filename.split("/").pop() ?? summary.filename}
            </div>
          </div>

          {/* Stats grid + done button */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <StatCard icon={Timer} label="Print Time" value={fmtDur(summary.print_duration)} />
              <StatCard icon={Clock} label="Total Time" value={fmtDur(summary.total_duration)} />
              <StatCard icon={Ruler} label="Filament" value={`${filamentMeters} m`} />
              <StatCard icon={Layers} label="Layers" value={summary.layers} />
            </div>
            <Button className="w-full h-11 font-semibold text-sm shrink-0" onClick={dismiss}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 flex flex-col justify-center space-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon size={11} />
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
