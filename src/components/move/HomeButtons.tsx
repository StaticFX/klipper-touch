import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";
import { Button } from "@/components/ui/button";

export function HomeButtons() {
  const { send } = useGcode();
  const homedAxes = usePrinterStore((s) => s.toolhead.homed_axes);

  const axes = [
    { label: "Home All", cmd: "G28", axes: "xyz" },
    { label: "Home X", cmd: "G28 X", axes: "x" },
    { label: "Home Y", cmd: "G28 Y", axes: "y" },
    { label: "Home Z", cmd: "G28 Z", axes: "z" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {axes.map((a) => {
        const allHomed = a.axes.split("").every((ax) => homedAxes.includes(ax));
        return (
          <Button
            key={a.label}
            variant={allHomed ? "default" : "secondary"}
            className={`h-12 ${allHomed ? "bg-primary/15 text-primary border border-primary/20" : ""}`}
            onClick={() => send(a.cmd)}
          >
            {a.label}
          </Button>
        );
      })}
    </div>
  );
}
