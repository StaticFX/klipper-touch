import { usePrintStore, type PrintSummary } from "@/stores/print-store";
import { FileBrowser } from "./FileBrowser";
import { ActivePrint } from "./ActivePrint";
import { PrintSummaryScreen } from "./PrintSummaryScreen";

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

  if (isActive) return <ActivePrint />;
  if (summary) return <PrintSummaryScreen summary={summary} />;
  return <FileBrowser />;
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
