import { useEffect, useRef, useCallback } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";

export function TemperatureGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const theme = useUiStore((s) => s.theme);

  const createPlot = useCallback((width: number, height: number) => {
    if (!containerRef.current) return;
    plotRef.current?.destroy();

    const isDark = theme === "dark";
    const axisStroke = isDark ? "#555" : "#999";
    const gridStroke = isDark ? "#222" : "#e5e7eb";
    const tickStroke = isDark ? "#333" : "#d1d5db";

    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
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
      series: [
        {},
        {
          label: "Hotend",
          stroke: "#3b82f6",
          width: 2,
          fill: "rgba(59,130,246,0.08)",
          paths: uPlot.paths.spline!(),
        },
        {
          label: "Bed",
          stroke: "#f97316",
          width: 2,
          fill: "rgba(249,115,22,0.08)",
          paths: uPlot.paths.spline!(),
        },
      ],
    };

    const data: uPlot.AlignedData = [[], [], []];
    plotRef.current = new uPlot(opts, data, containerRef.current);
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width > 0 && height > 0) {
      createPlot(width, height);
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          createPlot(w, h);
        }
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
    };
  }, [createPlot]);

  // Update data from store
  useEffect(() => {
    const unsub = usePrinterStore.subscribe((state) => {
      if (!plotRef.current) return;
      const h = state.temperatureHistory;
      if (h.length === 0) return;
      const times = h.map((s) => s.time);
      const ext = h.map((s) => s.extruder);
      const bed = h.map((s) => s.bed);
      plotRef.current.setData([times, ext, bed]);
    });
    return unsub;
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-2 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-1 px-1 shrink-0">
        <span className="text-xs text-muted-foreground">Temperature</span>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-[10px] text-muted-foreground">Hotend</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-orange-500 rounded" />
            <span className="text-[10px] text-muted-foreground">Bed</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-0" />
    </div>
  );
}
