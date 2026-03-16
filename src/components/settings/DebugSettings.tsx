import { Button } from "@/components/ui/button";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore, type PrintSummary } from "@/stores/print-store";
import { useToastStore } from "@/stores/toast-store";
import { InfoRow } from "./InfoRow";

const MOCK_SUMMARY: PrintSummary = {
  filename: "benchy_0.2mm_PLA.gcode",
  state: "complete",
  total_duration: 5820,
  print_duration: 5640,
  filament_used: 3420,
  layers: "138 / 138",
  thumbnailUrl: null,
};

export function DebugSettings() {
  const printState = usePrintStore((s) => s.print_stats.state);
  const summary = usePrintStore((s) => s.printSummary);
  const isMocked = printState === "printing";

  const toggleMockPrint = () => {
    if (isMocked) {
      usePrintStore.setState({
        print_stats: {
          state: "standby",
          filename: "",
          total_duration: 0,
          print_duration: 0,
          filament_used: 0,
          message: "",
        },
        display_status: { progress: 0, message: "" },
      });
    } else {
      usePrintStore.setState({
        print_stats: {
          state: "printing",
          filename: "benchy_0.2mm_PLA.gcode",
          total_duration: 5420,
          print_duration: 2710,
          filament_used: 4.832,
          message: "",
          info: { current_layer: 87, total_layer: 174 },
        },
        display_status: { progress: 0.50, message: "" },
      });
      usePrinterStore.setState({
        extruder: { temperature: 210.3, target: 215, power: 0.42, pressure_advance: 0.04 },
        heater_bed: { temperature: 59.8, target: 60, power: 0.15 },
        toolhead: {
          position: [120, 110, 14.2, 482],
          homed_axes: "xyz",
          max_velocity: 300,
          max_accel: 5000,
          square_corner_velocity: 5.0,
          print_time: 2710,
          estimated_print_time: 5420,
        },
        gcode_move: {
          gcode_position: [120, 110, 14.2, 482],
          homing_origin: [0, 0, 0, 0],
          speed: 3000,
          speed_factor: 1.0,
          extrude_factor: 1.0,
        },
        motionReport: {
          live_extruder_velocity: 3.2,
          live_velocity: 82,
          live_position: [120, 110, 14.2, 482],
        },
      });
    }
  };

  const showSummary = (state: PrintSummary["state"]) => {
    usePrintStore.setState({ printSummary: { ...MOCK_SUMMARY, state } });
  };

  const clearSummary = () => {
    usePrintStore.setState({ printSummary: null });
  };

  return (
    <div className="space-y-4">
      <InfoRow
        label="Mock Active Print"
        value={
          <Button variant="outline" size="sm" onClick={toggleMockPrint}>
            {isMocked ? "Stop Mock" : "Start Mock"}
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">
        Simulates an active print to preview the print screen UI.
      </p>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="text-sm font-medium">Mock Print Summary</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-green-500" onClick={() => showSummary("complete")}>
            Complete
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-orange-500" onClick={() => showSummary("cancelled")}>
            Cancelled
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => showSummary("error")}>
            Error
          </Button>
        </div>
        {summary && (
          <Button variant="ghost" size="sm" className="w-full" onClick={clearSummary}>
            Clear Summary
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Shows the print summary screen with mock data. Switch to the Print tab to see it.
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="text-sm font-medium">Mock Toasts</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-destructive"
            onClick={() => useToastStore.getState().addToast("Move out of range: 350.0 is beyond max X", "error")}>
            Error
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-orange-500"
            onClick={() => useToastStore.getState().addToast("Heater not reaching target temperature", "warning")}>
            Warning
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-primary"
            onClick={() => useToastStore.getState().addToast("Bed mesh calibration complete", "info")}>
            Info
          </Button>
        </div>
      </div>
    </div>
  );
}
