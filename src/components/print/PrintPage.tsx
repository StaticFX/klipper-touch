import { usePrintStore } from "@/stores/print-store";
import { FileBrowser } from "./FileBrowser";
import { ActivePrint } from "./ActivePrint";
import { PrintSummaryScreen } from "./PrintSummaryScreen";

export function PrintPage() {
  const state = usePrintStore((s) => s.print_stats.state);
  const summary = usePrintStore((s) => s.printSummary);
  const isActive = state === "printing" || state === "paused";

  if (isActive) return <ActivePrint />;
  if (summary) return <PrintSummaryScreen summary={summary} />;
  return <FileBrowser />;
}
