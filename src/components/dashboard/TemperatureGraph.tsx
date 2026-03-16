import { useEffect, useRef, useCallback, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { usePrinterStore, type TemperatureSample } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";

const COLORS = [
  "#3b82f6", // blue — extruder
  "#f97316", // orange — bed
  "#22c55e", // green
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ef4444", // red
  "#eab308", // yellow
  "#ec4899", // pink
];

const FILLS = [
  "rgba(59,130,246,0.08)",
  "rgba(249,115,22,0.08)",
  "rgba(34,197,94,0.06)",
  "rgba(168,85,247,0.06)",
  "rgba(6,182,212,0.06)",
  "rgba(239,68,68,0.06)",
  "rgba(234,179,8,0.06)",
  "rgba(236,72,153,0.06)",
];

function sensorLabel(key: string): string {
  // "heater_generic chamber" → "Chamber", "temperature_sensor mcu" → "MCU"
  const parts = key.split(" ");
  if (parts.length > 1) {
    const name = parts.slice(1).join(" ");
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function TemperatureGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const sensorsRef = useRef<string[]>([]);
  const theme = useUiStore((s) => s.theme);
  const hiddenSensors = useUiStore((s) => s.hiddenSensors);
  const hiddenRef = useRef(hiddenSensors);
  hiddenRef.current = hiddenSensors;
  const [legendKeys, setLegendKeys] = useState<string[]>(["extruder", "bed"]);

  const createPlot = useCallback((width: number, height: number, sensors: string[]) => {
    if (!containerRef.current) return;
    plotRef.current?.destroy();

    const isDark = theme === "dark";
    const axisStroke = isDark ? "#555" : "#999";
    const gridStroke = isDark ? "#222" : "#e5e7eb";
    const tickStroke = isDark ? "#333" : "#d1d5db";

    const series: uPlot.Series[] = [{}];
    for (let i = 0; i < sensors.length; i++) {
      series.push({
        label: sensorLabel(sensors[i]),
        stroke: COLORS[i % COLORS.length],
        width: 2,
        fill: FILLS[i % FILLS.length],
        paths: uPlot.paths.spline!(),
      });
    }

    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
      scales: {
        y: {
          range: (_u: uPlot, dataMin: number, dataMax: number) => [
            Math.min(0, dataMin),
            Math.max(60, dataMax + 5),
          ],
        },
      },
      axes: [
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: tickStroke, width: 1 },
          font: "10px system-ui",
          values: (_u: uPlot, vals: number[]) =>
            vals.map((v) => {
              const d = new Date(v * 1000);
              return `${d.getMinutes()}:${String(d.getSeconds()).padStart(2, "0")}`;
            }),
        },
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: tickStroke, width: 1 },
          font: "10px system-ui",
          values: (_u: uPlot, vals: number[]) => vals.map((v) => `${v}°`),
        },
      ],
      series,
    };

    const emptyData: uPlot.AlignedData = [[], ...sensors.map(() => [] as number[])];
    plotRef.current = new uPlot(opts, emptyData, containerRef.current);
    sensorsRef.current = sensors;
  }, [theme]);

  // Discover sensors from history and create/recreate plot
  useEffect(() => {
    if (!containerRef.current) return;

    const buildPlot = () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      const state = usePrinterStore.getState();
      const sensors = discoverSensors(state.temperatureHistory, hiddenRef.current);
      const changed = sensors.length !== sensorsRef.current.length ||
        sensors.some((s, i) => s !== sensorsRef.current[i]);

      if (!plotRef.current || changed) {
        createPlot(width, height, sensors);
        setLegendKeys(sensors);
      }
    };

    buildPlot();

    const ro = new ResizeObserver(() => buildPlot());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [createPlot, hiddenSensors]);

  // Push data on store updates
  useEffect(() => {
    const unsub = usePrinterStore.subscribe((state) => {
      const h = state.temperatureHistory;
      if (h.length === 0 || !plotRef.current) return;

      const sensors = sensorsRef.current;
      if (sensors.length === 0) return;

      // Check if new sensors appeared (filtered by hidden)
      const latest = h[h.length - 1].temps;
      const currentKeys = Object.keys(latest).sort().filter((k) => !hiddenRef.current.includes(k));
      const needsRebuild = currentKeys.length !== sensors.length ||
        currentKeys.some((k, i) => k !== sensors[i]);

      if (needsRebuild && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          createPlot(width, height, currentKeys);
          setLegendKeys(currentKeys);
        }
      }

      const times = h.map((s) => s.time);
      const seriesData = sensorsRef.current.map((key) =>
        h.map((s) => s.temps[key] ?? 0)
      );
      plotRef.current?.setData([times, ...seriesData]);
    });
    return unsub;
  }, [createPlot]);

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

function discoverSensors(history: TemperatureSample[], hidden: string[]): string[] {
  if (history.length === 0) return ["extruder", "bed"].filter((k) => !hidden.includes(k));
  const latest = history[history.length - 1].temps;
  return Object.keys(latest).sort().filter((k) => !hidden.includes(k));
}
