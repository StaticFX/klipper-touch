import { usePrintStore } from "@/stores/print-store";
import { useUiStore } from "@/stores/ui-store";
import { useGcode } from "@/hooks/use-gcode";
import { pausePrint, resumePrint, cancelPrint } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { Pause, Play, X, Loader2 } from "lucide-react";

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

export function PrintTab({ filename, thumbnailUrl }: { filename: string; thumbnailUrl: string | null }) {
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
      {/* Portrait: stack vertically. Landscape: side by side */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-4">
        {/* Thumbnail */}
        <div className="shrink-0 self-center w-32 h-32 landscape:aspect-square landscape:w-auto landscape:h-full landscape:max-h-[200px] rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center">
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
