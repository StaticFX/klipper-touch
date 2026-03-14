import { useState } from "react";
import { JogPad } from "./JogPad";
import { ZControls } from "./ZControls";
import { HomeButtons } from "./HomeButtons";
import { ExtrudeControls } from "./ExtrudeControls";

const STEP_SIZES = [0.1, 1, 10, 100];

export function MovePage() {
  const [stepSize, setStepSize] = useState(10);

  return (
    <div className="p-3 space-y-3">
      <div className="flex gap-2">
        {STEP_SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setStepSize(s)}
            className={`flex-1 min-h-[40px] rounded-lg border text-sm font-medium
              active:scale-95 transition-transform
              ${stepSize === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border"
              }`}
          >
            {s}mm
          </button>
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
