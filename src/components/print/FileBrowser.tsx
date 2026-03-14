import { useEffect, useRef, useCallback } from "react";
import { useFilesStore } from "@/stores/files-store";
import { startPrint, deleteFile, getThumbnailUrl } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import { FileText, RefreshCw, Trash2 } from "lucide-react";

function bestThumbnailPath(file: { path: string; thumbnails?: { width: number; relative_path: string }[] }): string | undefined {
  if (!file.thumbnails?.length) return undefined;
  return [...file.thumbnails].sort((a, b) => b.width - a.width)[0].relative_path;
}

export function FileBrowser() {
  const files = useFilesStore((s) => s.files);
  const loading = useFilesStore((s) => s.loading);
  const error = useFilesStore((s) => s.error);
  const fetchFiles = useFilesStore((s) => s.fetchFiles);
  const showConfirm = useUiStore((s) => s.showConfirm);
  const connected = usePrinterStore((s) => s.moonrakerConnected);
  const klippyReady = usePrinterStore((s) => s.klippyState) === "ready";

  useEffect(() => {
    if (connected && klippyReady) {
      fetchFiles();
    }
  }, [connected, klippyReady, fetchFiles]);

  const handlePrint = (filename: string, thumbUrl?: string) => {
    showConfirm({
      title: "Start Print",
      message: filename,
      imageUrl: thumbUrl,
      onConfirm: () => startPrint(filename),
    });
  };

  const handleDelete = (filename: string) => {
    showConfirm({
      title: "Delete File",
      message: `Delete ${filename}? This cannot be undone.`,
      onConfirm: async () => {
        await deleteFile(filename);
        fetchFiles();
      },
    });
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading files...</div>;
  }
  if (error) {
    return <div className="text-center text-destructive py-8">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">G-code Files</h2>
        <button
          onClick={fetchFiles}
          className="flex items-center gap-1 text-xs text-primary active:scale-95"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
      {files.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No files found</div>
      ) : (
        <div className="space-y-1">
          {files.map((file) => {
            const thumbPath = bestThumbnailPath(file);
            const thumbUrl = thumbPath ? getThumbnailUrl(file.path, thumbPath) : undefined;
            return (
              <FileCard
                key={file.path}
                filename={file.path}
                size={file.size}
                modified={file.modified}
                thumbUrl={thumbUrl}
                estimatedTime={file.estimated_time}
                onPrint={() => handlePrint(file.path, thumbUrl)}
                onDelete={() => handleDelete(file.path)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function FileCard({
  filename,
  size,
  modified,
  thumbUrl,
  estimatedTime,
  onPrint,
  onDelete,
}: {
  filename: string;
  size: number;
  modified: number;
  thumbUrl?: string;
  estimatedTime?: number;
  onPrint: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fetchMetadata = useFilesStore((s) => s.fetchMetadata);

  // Lazy-load metadata when the card scrolls into view
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) {
        fetchMetadata(filename);
      }
    },
    [filename, fetchMetadata]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const name = filename.split("/").pop() ?? filename;
  const date = new Date(modified * 1000).toLocaleDateString();
  const sizeMb = (size / (1024 * 1024)).toFixed(1);

  return (
    <div ref={ref} className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
      <button
        onClick={onPrint}
        className="flex-1 flex items-center gap-3 text-left active:scale-[0.98] transition-transform min-w-0"
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="w-12 h-12 rounded bg-muted object-cover shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 ${thumbUrl ? "hidden" : ""}`}
        >
          <FileText size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-xs text-muted-foreground">
            {sizeMb} MB · {date}
            {estimatedTime && ` · ${formatDuration(estimatedTime)}`}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2 rounded-lg text-muted-foreground active:scale-90 active:text-destructive shrink-0"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
