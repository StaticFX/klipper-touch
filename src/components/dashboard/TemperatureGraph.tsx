import "uplot/dist/uPlot.min.css";
import { useUPlot, COLORS, sensorLabel } from "@/hooks/use-uplot";

export function TemperatureGraph() {
  const { containerRef, legendKeys } = useUPlot();

  return (
    <div className="bg-card border border-border rounded-xl p-2 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-1 px-1 shrink-0">
        <span className="text-xs text-muted-foreground">Temperature</span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {legendKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] text-muted-foreground">{sensorLabel(key)}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-0" />
    </div>
  );
}
