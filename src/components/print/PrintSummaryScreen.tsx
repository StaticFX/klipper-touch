import { usePrintStore, type PrintSummary } from "@/stores/print-store";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

function fmtDur(s: number): string {
  if (!s || !isFinite(s)) return "--:--";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle2, label: "Print Complete", color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { icon: XCircle, label: "Print Cancelled", color: "text-orange-500", bg: "bg-orange-500/10" },
  error: { icon: AlertCircle, label: "Print Failed", color: "text-destructive", bg: "bg-destructive/10" },
} as const;

export function PrintSummaryScreen({ summary }: { summary: PrintSummary }) {
  const dismiss = usePrintStore((s) => s.dismissSummary);
  const cfg = STATUS_CONFIG[summary.state];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col h-full items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        {/* Status icon + label */}
        <div className="flex flex-col items-center gap-2">
          <div className={`p-3 rounded-full ${cfg.bg}`}>
            <Icon size={40} className={cfg.color} />
          </div>
          <div className={`text-lg font-semibold ${cfg.color}`}>{cfg.label}</div>
        </div>

        {/* Thumbnail + filename */}
        <div className="flex flex-col items-center gap-2">
          {summary.thumbnailUrl && (
            <div className="w-32 h-32 rounded-xl bg-muted border border-border overflow-hidden">
              <img src={summary.thumbnailUrl} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-sm font-medium text-center truncate max-w-full">{summary.filename}</div>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <StatRow label="Print Time" value={fmtDur(summary.print_duration)} />
          <StatRow label="Total Time" value={fmtDur(summary.total_duration)} />
          <StatRow label="Filament Used" value={`${(summary.filament_used / 1000).toFixed(2)} m`} />
          <StatRow label="Layers" value={summary.layers} />
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-[0.97]"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
