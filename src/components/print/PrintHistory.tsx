import { useEffect, useCallback } from "react";
import { useHistoryStore } from "@/stores/history-store";
import { useUiStore } from "@/stores/ui-store";
import { startPrint, getThumbnailUrl } from "@/lib/moonraker/client";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Printer, Clock, Ruler } from "lucide-react";

export function PrintHistory() {
  const jobs = useHistoryStore((s) => s.jobs);
  const totals = useHistoryStore((s) => s.totals);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const hasMore = useHistoryStore((s) => s.hasMore);
  const fetchJobs = useHistoryStore((s) => s.fetchJobs);
  const fetchMore = useHistoryStore((s) => s.fetchMore);
  const fetchTotals = useHistoryStore((s) => s.fetchTotals);
  const removeJob = useHistoryStore((s) => s.removeJob);
  const showConfirm = useUiStore((s) => s.showConfirm);

  useEffect(() => {
    fetchJobs();
    fetchTotals();
  }, [fetchJobs, fetchTotals]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) fetchMore();
  }, [hasMore, loading, fetchMore]);

  const loadMoreRef = useIntersectionObserver(handleLoadMore);

  const handleReprint = (filename: string) => {
    showConfirm({
      title: "Reprint",
      message: `Start printing ${filename}?`,
      onConfirm: () => startPrint(filename),
    });
  };

  const handleDelete = (jobId: string, filename: string) => {
    showConfirm({
      title: "Delete History Entry",
      message: `Remove "${filename}" from print history?`,
      onConfirm: () => removeJob(jobId),
    });
  };

  if (error) {
    return <div className="text-center text-destructive py-8 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-2 px-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Print History</h2>
        <Button variant="ghost" size="xs" onClick={() => fetchJobs()}>
          <RefreshCw size={12} /> Refresh
        </Button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-3 gap-2">
          <TotalBox icon={<Printer size={12} />} label="Jobs" value={String(totals.total_jobs)} />
          <TotalBox icon={<Clock size={12} />} label="Time" value={formatDuration(totals.total_time)} />
          <TotalBox icon={<Ruler size={12} />} label="Filament" value={formatFilament(totals.total_filament_used)} />
        </div>
      )}

      {/* Job list */}
      {jobs.length === 0 && !loading ? (
        <div className="text-center text-muted-foreground py-8 text-sm">No print history</div>
      ) : (
        <div className="space-y-1">
          {jobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              onReprint={() => handleReprint(job.filename)}
              onDelete={() => handleDelete(job.job_id, job.filename)}
            />
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="text-center py-4 text-sm text-muted-foreground">
              {loading ? "Loading..." : ""}
            </div>
          )}
        </div>
      )}

      {loading && jobs.length === 0 && (
        <div className="text-center text-muted-foreground py-8 text-sm">Loading...</div>
      )}
    </div>
  );
}

function JobCard({ job, onReprint, onDelete }: {
  job: import("@/lib/moonraker/types").HistoryJob;
  onReprint: () => void;
  onDelete: () => void;
}) {
  const thumbPath = job.metadata?.thumbnails?.sort((a, b) => b.width - a.width)[0]?.relative_path;
  const thumbUrl = thumbPath ? getThumbnailUrl(job.filename, thumbPath) : undefined;
  const name = job.filename.split("/").pop() ?? job.filename;
  const date = new Date(job.end_time * 1000);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const statusColors: Record<string, string> = {
    completed: "bg-green-500/20 text-green-600",
    cancelled: "bg-yellow-500/20 text-yellow-500",
    error: "bg-destructive/20 text-destructive",
    in_progress: "bg-primary/20 text-primary",
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
      {/* Thumbnail */}
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="w-10 h-10 rounded-lg bg-muted object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Printer size={16} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{dateStr} {timeStr}</span>
          <span>·</span>
          <span>{formatDuration(job.print_duration)}</span>
        </div>
      </div>

      {/* Status badge */}
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0 ${statusColors[job.status] ?? statusColors.error}`}>
        {job.status === "in_progress" ? "active" : job.status}
      </span>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        {job.exists && job.status !== "in_progress" && (
          <Button variant="ghost" size="icon-xs" onClick={onReprint} title="Reprint">
            <Printer size={14} />
          </Button>
        )}
        <Button variant="ghost" size="icon-xs" onClick={onDelete} className="text-muted-foreground active:text-destructive" title="Delete">
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function TotalBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatFilament(mm: number): string {
  if (mm > 1000) return `${(mm / 1000).toFixed(1)}m`;
  return `${Math.round(mm)}mm`;
}
