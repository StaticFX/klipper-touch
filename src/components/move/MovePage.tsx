import { useState } from "react";
import { JogPad } from "./JogPad";
import { ZControls } from "./ZControls";
import { HomeButtons } from "./HomeButtons";
import { ExtrudeControls } from "./ExtrudeControls";
import { Button } from "@/components/ui/button";

const STEP_SIZES = [0.1, 1, 10, 100];

export function MovePage() {
  const [stepSize, setStepSize] = useState(10);

  return (
    <div className="p-3 space-y-3">
      <div className="flex gap-2">
        {STEP_SIZES.map((s) => (
          <Button
            key={s}
            variant={stepSize === s ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => setStepSize(s)}
          >
            {s}mm
          </Button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <JogPad stepSize={stepSize} />
        </div>
        <div className="w-20">
          <ZControls stepSize={stepSize} />
        </div>
      </div>

      <HomeButtons />
      <ExtrudeControls />
    </div>
  );
}
