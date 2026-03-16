import { usePrintStore } from "@/stores/print-store";
import { pausePrint, resumePrint, cancelPrint } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

export function PrintControls() {
  const state = usePrintStore((s) => s.print_stats.state);
  const showConfirm = useUiStore((s) => s.showConfirm);

  return (
    <div className="grid grid-cols-2 gap-3">
      {state === "printing" ? (
        <Button
          variant="secondary"
          className="h-14 text-base bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
          onClick={pausePrint}
        >
          Pause
        </Button>
      ) : (
        <Button
          className="h-14 text-base bg-primary/20 text-primary border border-primary/30"
          onClick={resumePrint}
        >
          Resume
        </Button>
      )}
      <Button
        variant="destructive-subtle"
        className="h-14 text-base"
        onClick={() =>
          showConfirm({
            title: "Cancel Print",
            message: "Are you sure you want to cancel the current print?",
            onConfirm: cancelPrint,
          })
        }
      >
        Cancel
      </Button>
    </div>
  );
}
