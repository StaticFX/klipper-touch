import { useState, useCallback } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { queryEndstops } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";
import type { SectionMode } from "./ActionsPage";

export function EndstopsSection({ mode: _mode }: { mode: SectionMode }) {
  const storeEndstops = usePrinterStore((s) => s.queryEndstops);
  const connected = usePrinterStore((s) => s.klippyState) === "ready";
  const [loading, setLoading] = useState(false);
  const [endstops, setEndstops] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryEndstops();
      setEndstops(result);
    } catch {
      // ignore — will show stale or no data
    } finally {
      setLoading(false);
    }
  }, []);

  // Use locally-fetched data first, fall back to store subscription
  const data = endstops ?? storeEndstops?.last_query ?? null;
  const entries = data ? Object.entries(data) : [];

  return (
    <div className="space-y-3">
      {!connected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
          <WifiOff size={14} className="text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            Not connected to printer.
          </p>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Endstop States</div>
          <Button
            variant="outline"
            size="xs"
            disabled={!connected || loading}
            onClick={refresh}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Query
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">
            {connected
              ? "Press Query to read endstop states."
              : "Connect to printer to query endstops."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {entries.map(([name, state]) => {
              const stateStr = String(state).toLowerCase();
              const triggered = stateStr === "triggered" || stateStr === "1" || stateStr === "true";
              return (
                <div
                  key={name}
                  className="bg-muted/50 rounded-lg px-3 py-2 text-center"
                >
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {name}
                  </div>
                  <div
                    className={`text-sm font-bold ${triggered ? "text-red-500" : "text-green-500"}`}
                  >
                    {triggered ? "TRIGGERED" : "OPEN"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Endstop states are read on demand. Press Query to refresh.
      </p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl px-3 py-2.5">{children}</div>;
}
