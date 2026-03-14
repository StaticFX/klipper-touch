import { usePrintStore } from "@/stores/print-store";
import { FileBrowser } from "./FileBrowser";
import { PrintProgress } from "./PrintProgress";
import { PrintControls } from "./PrintControls";

export function PrintPage() {
  const state = usePrintStore((s) => s.print_stats.state);
  const isActive = state === "printing" || state === "paused";

  return (
    <div className="p-3 space-y-3">
      {isActive ? (
        <>
          <PrintProgress />
          <PrintControls />
        </>
      ) : (
        <FileBrowser />
      )}
    </div>
  );
}
