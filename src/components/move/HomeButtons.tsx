import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";

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
          <button
            key={a.label}
            onClick={() => send(a.cmd)}
            className={`min-h-[48px] rounded-lg border text-sm font-medium
              active:scale-95 transition-transform
              ${allHomed
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-secondary text-secondary-foreground border-border"
              }`}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
