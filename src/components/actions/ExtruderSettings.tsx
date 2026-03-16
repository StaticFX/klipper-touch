import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExtruderConfigStore } from "@/stores/extruder-config-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";

export function ExtruderSettings() {
  const store = useExtruderConfigStore();
  const [keypad, setKeypad] = useState<{
    field: "feedAmount" | "feedSpeed" | "filDiameter";
    current: number;
  } | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Extruder Settings</div>

      {/* Numeric settings */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "feedAmount", current: store.defaultFeedAmount })}
        >
          <span className="text-sm text-muted-foreground">Default Feed Amount</span>
          <span className="text-sm font-medium tabular-nums">{store.defaultFeedAmount} mm</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "feedSpeed", current: store.defaultFeedSpeed })}
        >
          <span className="text-sm text-muted-foreground">Default Feed Speed</span>
          <span className="text-sm font-medium tabular-nums">{store.defaultFeedSpeed} mm/s</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 justify-between px-4"
          onClick={() => setKeypad({ field: "filDiameter", current: store.filamentDiameter })}
        >
          <span className="text-sm text-muted-foreground">Filament Diameter</span>
          <span className="text-sm font-medium tabular-nums">{store.filamentDiameter} mm</span>
        </Button>
      </div>

      {/* Macro names */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Load/Unload Macros</div>
        <div className="text-[10px] text-muted-foreground mb-2">
          Leave empty to use default G-code (heat + extrude/retract 100mm).
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Load Macro</label>
            <Input
              value={store.loadMacro}
              onChange={(e) => store.setLoadMacro(e.target.value.toUpperCase())}
              placeholder="e.g. LOAD_FILAMENT"
              className="h-10 font-mono text-sm"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Unload Macro</label>
            <Input
              value={store.unloadMacro}
              onChange={(e) => store.setUnloadMacro(e.target.value.toUpperCase())}
              placeholder="e.g. UNLOAD_FILAMENT"
              className="h-10 font-mono text-sm"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {keypad && (() => {
        const meta: Record<string, { title: string; unit: string; min: number; max: number }> = {
          feedAmount: { title: "Default Feed Amount", unit: "mm", min: 1, max: 200 },
          feedSpeed: { title: "Default Feed Speed", unit: "mm/s", min: 1, max: 50 },
          filDiameter: { title: "Filament Diameter", unit: "mm", min: 1, max: 3 },
        };
        const m = meta[keypad.field];
        return (
          <NumericKeypad
            title={m.title}
            initialValue={keypad.current}
            unit={m.unit}
            min={m.min}
            max={m.max}
            onSubmit={(v) => {
              switch (keypad.field) {
                case "feedAmount": store.setDefaultFeedAmount(v); break;
                case "feedSpeed": store.setDefaultFeedSpeed(v); break;
                case "filDiameter": store.setFilamentDiameter(v); break;
              }
              setKeypad(null);
            }}
            onCancel={() => setKeypad(null)}
          />
        );
      })()}
    </div>
  );
}
