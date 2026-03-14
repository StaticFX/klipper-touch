import { usePrintStore } from "@/stores/print-store";
import { pausePrint, resumePrint, cancelPrint } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";

export function PrintControls() {
  const state = usePrintStore((s) => s.print_stats.state);
  const showConfirm = useUiStore((s) => s.showConfirm);

  return (
    <div className="grid grid-cols-2 gap-3">
      {state === "printing" ? (
        <button
          onClick={pausePrint}
          className="min-h-[56px] rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30
            text-base font-medium active:scale-95 transition-transform"
        >
          Pause
        </button>
      ) : (
        <button
          onClick={resumePrint}
          className="min-h-[56px] rounded-lg bg-primary/20 text-primary border border-primary/30
            text-base font-medium active:scale-95 transition-transform"
        >
          Resume
        </button>
      )}
      <button
        onClick={() =>
          showConfirm({
            title: "Cancel Print",
            message: "Are you sure you want to cancel the current print?",
            onConfirm: cancelPrint,
          })
        }
        className="min-h-[56px] rounded-lg bg-destructive/20 text-destructive border border-destructive/30
          text-base font-medium active:scale-95 transition-transform"
      >
        Cancel
      </button>
    </div>
  );
}
