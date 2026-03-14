import { usePrintStore } from "@/stores/print-store";

export function PrintProgress() {
  const stats = usePrintStore((s) => s.print_stats);
  const progress = usePrintStore((s) => s.display_status.progress);

  const pct = Math.round(progress * 100);
  const elapsed = formatDuration(stats.print_duration);
  const remaining =
    progress > 0
      ? formatDuration(stats.print_duration / progress - stats.print_duration)
      : "--";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate max-w-[60%]">
          {stats.filename || "Unknown"}
        </span>
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Elapsed" value={elapsed} />
        <Stat label="Remaining" value={remaining} />
        <Stat
          label="Layer"
          value={
            stats.info?.current_layer && stats.info?.total_layer
              ? `${stats.info.current_layer}/${stats.info.total_layer}`
              : "--"
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
