import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "running" | "success" | "error";

export function UpdateModal({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("running");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten: (() => void)[] = [];

    listen<string>("update-output", (event) => {
      setLines((prev) => [...prev, event.payload]);
    }).then((fn) => unlisten.push(fn));

    listen<string>("update-done", (event) => {
      setStatus(event.payload === "success" ? "success" : "error");
    }).then((fn) => unlisten.push(fn));

    invoke("perform_update").catch((err) => {
      setLines((prev) => [...prev, `Error: ${err}`]);
      setStatus("error");
    });

    return () => {
      unlisten.forEach((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl w-[90%] max-w-lg flex flex-col max-h-[80%] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {status === "running" && <Loader2 size={16} className="animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 size={16} className="text-green-500" />}
            {status === "error" && <AlertCircle size={16} className="text-destructive" />}
            <span className="text-sm font-medium">
              {status === "running" && "Updating..."}
              {status === "success" && "Update Complete"}
              {status === "error" && "Update Failed"}
            </span>
          </div>
          {status !== "running" && (
            <Button variant="ghost" size="icon-xs" onClick={onClose}>
              <X size={14} />
            </Button>
          )}
        </div>

        {/* Console output */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-black/90 text-green-400 min-h-[200px]"
        >
          {lines.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))}
          {status === "running" && lines.length === 0 && (
            <div className="text-muted-foreground">Starting update...</div>
          )}
        </div>

        {/* Footer */}
        {status !== "running" && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <Button className="w-full" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
