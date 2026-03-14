import { usePrinterStore } from "@/stores/printer-store";

export function useTemperature() {
  const extruder = usePrinterStore((s) => s.extruder);
  const bed = usePrinterStore((s) => s.heater_bed);
  const history = usePrinterStore((s) => s.temperatureHistory);
  return { extruder, bed, history };
}
