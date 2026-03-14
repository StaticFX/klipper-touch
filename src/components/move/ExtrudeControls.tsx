import { useState } from "react";
import { useGcode } from "@/hooks/use-gcode";

export function ExtrudeControls() {
  const { send } = useGcode();
  const [length, setLength] = useState(10);
  const lengths = [5, 10, 25, 50];

  const extrude = (dir: number) => {
    send(`M83\nG1 E${dir * length} F300\nM82`);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="text-xs text-muted-foreground">Extruder</div>
      <div className="flex gap-2">
        {lengths.map((l) => (
          <button
            key={l}
            onClick={() => setLength(l)}
            className={`flex-1 min-h-[36px] rounded-lg border text-xs font-medium
              active:scale-95 transition-transform
              ${length === l
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border"
              }`}
          >
            {l}mm
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => extrude(-1)}
          className="min-h-[48px] rounded-lg bg-secondary border border-border text-sm font-medium
            active:scale-95 transition-transform"
        >
          Retract
        </button>
        <button
          onClick={() => extrude(1)}
          className="min-h-[48px] rounded-lg bg-secondary border border-border text-sm font-medium
            active:scale-95 transition-transform"
        >
          Extrude
        </button>
      </div>
    </div>
  );
}
