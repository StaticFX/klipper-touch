import { usePrintStore } from "@/stores/print-store";
import { FileBrowser } from "./FileBrowser";
import { ActivePrint } from "./ActivePrint";

export function PrintPage() {
  const state = usePrintStore((s) => s.print_stats.state);
  const isActive = state === "printing" || state === "paused";

  return isActive ? <ActivePrint /> : <FileBrowser />;
}
