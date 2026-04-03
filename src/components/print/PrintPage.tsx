import { useState } from "react";
import { usePrintStore, type PrintSummary } from "@/stores/print-store";
import { FileBrowser } from "./FileBrowser";
import { PrintHistory } from "./PrintHistory";
import { ActivePrint } from "./ActivePrint";
import { PrintSummaryScreen } from "./PrintSummaryScreen";
import { Button } from "@/components/ui/button";

const MOCK_SUMMARY: PrintSummary = {
  filename: "benchy_v2.gcode",
  state: "complete",
  total_duration: 5820,
  print_duration: 5640,
  filament_used: 3420,
  layers: "138 / 138",
  thumbnailUrl: null,
};

export function PrintPage() {
  const state = usePrintStore((s) => s.print_stats.state);
  const summary = usePrintStore((s) => s.printSummary);
  const isActive = state === "printing" || state === "paused";
  const [view, setView] = useState<"files" | "history">("files");

  if (isActive) return <ActivePrint />;
  if (summary) return <PrintSummaryScreen summary={summary} />;

  return (
    <div className="flex flex-col h-full">
      {/* Toggle header */}
      <div className="flex gap-1 px-3 pt-2 pb-1 shrink-0">
        <Button
          variant={view === "files" ? "default" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => setView("files")}
        >
          Files
        </Button>
        <Button
          variant={view === "history" ? "default" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => setView("history")}
        >
          History
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {view === "files" ? <FileBrowser /> : <PrintHistory />}
      </div>
    </div>
  );
}

/** Inject a mock summary for design preview — call from console or dev button */
export function showMockSummary(overrides?: Partial<PrintSummary>) {
  usePrintStore.setState({ printSummary: { ...MOCK_SUMMARY, ...overrides } });
}

/** Preview all three summary states */
export function showMockSummaryState(state: PrintSummary["state"]) {
  usePrintStore.setState({
    printSummary: { ...MOCK_SUMMARY, state },
  });
}
