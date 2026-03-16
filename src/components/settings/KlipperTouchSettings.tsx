import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useUiStore, ACCENT_PRESETS } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import { InfoRow } from "./InfoRow";
import { Sun, Moon, Thermometer, Eye, EyeOff, Check } from "lucide-react";

export function KlipperTouchSettings() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const accentHue = useUiStore((s) => s.accentHue);
  const setAccentHue = useUiStore((s) => s.setAccentHue);
  const hiddenSensors = useUiStore((s) => s.hiddenSensors);
  const toggleSensor = useUiStore((s) => s.toggleSensor);
  const history = usePrinterStore((s) => s.temperatureHistory);
  const extraTemps = usePrinterStore((s) => s.extraTemps);

  const allSensors = useMemo(() => {
    const keys = new Set<string>();
    keys.add("extruder");
    keys.add("bed");
    for (const k of Object.keys(extraTemps)) keys.add(k);
    if (history.length > 0) {
      for (const k of Object.keys(history[history.length - 1].temps)) keys.add(k);
    }
    return Array.from(keys).sort();
  }, [extraTemps, history]);

  const sensorLabel = (key: string): string => {
    const parts = key.split(" ");
    if (parts.length > 1) {
      const name = parts.slice(1).join(" ");
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="space-y-5">
      {/* Theme */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Appearance</div>
        <InfoRow
          label="Theme"
          value={
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
              {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "light" ? "Light" : "Dark"}
            </Button>
          }
        />
      </div>

      {/* Accent color */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Accent Color</div>
        <div className="flex flex-wrap gap-1.5 landscape:gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const isActive = accentHue === preset.hue;
            return (
              <button
                key={preset.hue}
                className={`w-8 h-8 landscape:w-9 landscape:h-9 rounded-full border-2 transition-all active:scale-95 flex items-center justify-center ${
                  isActive ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: `oklch(0.6 0.2 ${preset.hue})` }}
                onClick={() => setAccentHue(preset.hue)}
                title={preset.name}
              >
                {isActive && <Check size={16} className="text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensor visibility */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Temperature Sensors</div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Toggle which sensors appear on the dashboard graph.
        </p>
        <div className="space-y-1">
          {allSensors.map((key) => {
            const visible = !hiddenSensors.includes(key);
            return (
              <Button
                key={key}
                variant="outline"
                className="w-full justify-start h-auto px-3 py-2.5"
                onClick={() => toggleSensor(key)}
              >
                {visible ? (
                  <Eye size={16} className="text-primary shrink-0" />
                ) : (
                  <EyeOff size={16} className="text-muted-foreground shrink-0" />
                )}
                <span className="text-sm flex-1 text-left">{sensorLabel(key)}</span>
                <Thermometer size={14} className="text-muted-foreground" />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
