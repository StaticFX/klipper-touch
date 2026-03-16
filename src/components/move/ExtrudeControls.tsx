import { useState } from "react";
import { useGcode } from "@/hooks/use-gcode";
import { Button } from "@/components/ui/button";

export function ExtrudeControls() {
  const { send } = useGcode();
  const [length, setLength] = useState(10);
  const lengths = [5, 10, 25, 50];

  const extrude = (dir: number) => {
    send(`M83\nG1 E${dir * length} F300\nM82`);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <div className="text-xs text-muted-foreground">Extruder</div>
      <div className="flex gap-2">
        {lengths.map((l) => (
          <Button
            key={l}
            variant={length === l ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => setLength(l)}
          >
            {l}mm
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-12" onClick={() => extrude(-1)}>
          Retract
        </Button>
        <Button variant="secondary" className="h-12" onClick={() => extrude(1)}>
          Extrude
        </Button>
      </div>
    </div>
  );
}
