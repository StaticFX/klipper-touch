import { useRef, useEffect, useCallback, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useUiStore } from "@/stores/ui-store";
import { listFiles, getFileUrl } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3 } from "lucide-react";

export interface ResonanceData {
  axis: "x" | "y";
  frequencies: number[];
  psd_x: number[];
  psd_y: number[];
  psd_z: number[];
  psd_xyz: number[];
  filename: string;
}

function parseResonanceCsv(csv: string): Omit<ResonanceData, "axis" | "filename"> | null {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;

  const header = lines[0].toLowerCase();
  const cols = header.split(",").map((c) => c.trim());
  const freqIdx = cols.indexOf("freq");
  const psdXIdx = cols.indexOf("psd_x");
  const psdYIdx = cols.indexOf("psd_y");
  const psdZIdx = cols.indexOf("psd_z");
  const psdXyzIdx = cols.indexOf("psd_xyz");

  if (freqIdx < 0 || psdXyzIdx < 0) return null;

  const frequencies: number[] = [];
  const psd_x: number[] = [];
  const psd_y: number[] = [];
  const psd_z: number[] = [];
  const psd_xyz: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length <= freqIdx) continue;
    const freq = parseFloat(parts[freqIdx]);
    if (isNaN(freq)) continue;

    frequencies.push(freq);
    psd_x.push(psdXIdx >= 0 ? parseFloat(parts[psdXIdx]) || 0 : 0);
    psd_y.push(psdYIdx >= 0 ? parseFloat(parts[psdYIdx]) || 0 : 0);
    psd_z.push(psdZIdx >= 0 ? parseFloat(parts[psdZIdx]) || 0 : 0);
    psd_xyz.push(parseFloat(parts[psdXyzIdx]) || 0);
  }

  if (frequencies.length === 0) return null;
  return { frequencies, psd_x, psd_y, psd_z, psd_xyz };
}

async function fetchResonanceFiles(): Promise<ResonanceData[]> {
  const results: ResonanceData[] = [];
  try {
    const files = await listFiles("config");
    // Find resonance CSV files, sorted by most recent
    const csvFiles = files
      .filter((f) => /^resonances_[xy].*\.csv$/i.test(f.path.split("/").pop() ?? ""))
      .sort((a, b) => b.modified - a.modified);

    // Get most recent file per axis
    const seen = new Set<string>();
    const toFetch: { path: string; axis: "x" | "y" }[] = [];
    for (const f of csvFiles) {
      const name = f.path.split("/").pop() ?? "";
      const axis = name.includes("_x") ? "x" : "y";
      if (!seen.has(axis)) {
        seen.add(axis);
        toFetch.push({ path: f.path, axis });
      }
      if (seen.size >= 2) break;
    }

    for (const { path, axis } of toFetch) {
      try {
        const url = getFileUrl("config", path);
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const csv = await resp.text();
        const parsed = parseResonanceCsv(csv);
        if (parsed) {
          results.push({ ...parsed, axis, filename: path.split("/").pop() ?? path });
        }
      } catch {
        // skip individual file errors
      }
    }
  } catch {
    // no files available
  }
  return results;
}

interface ShaperGraphProps {
  axis: "x" | "y";
  shaperFreq: number;
}

export function ShaperGraph({ axis, shaperFreq }: ShaperGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const theme = useUiStore((s) => s.theme);
  const [data, setData] = useState<ResonanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNoData(false);
    const files = await fetchResonanceFiles();
    const match = files.find((f) => f.axis === axis);
    if (match) {
      setData(match);
      setNoData(false);
    } else {
      setData(null);
      setNoData(true);
    }
    setLoading(false);
  }, [axis]);

  // Auto-load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build the plot when data or theme changes
  useEffect(() => {
    if (!data || !containerRef.current) return;

    plotRef.current?.destroy();

    const el = containerRef.current;
    const { width } = el.getBoundingClientRect();
    if (width <= 0) return;

    const isDark = theme === "dark";
    const axisStroke = isDark ? "#555" : "#999";
    const gridStroke = isDark ? "#222" : "#e5e7eb";
    const tickStroke = isDark ? "#333" : "#d1d5db";

    const series: uPlot.Series[] = [
      {},
      {
        label: "PSD X",
        stroke: "#3b82f6",
        width: 1.5,
        fill: "rgba(59,130,246,0.06)",
        paths: uPlot.paths.spline!(),
      },
      {
        label: "PSD Y",
        stroke: "#f97316",
        width: 1.5,
        fill: "rgba(249,115,22,0.06)",
        paths: uPlot.paths.spline!(),
      },
      {
        label: "PSD Z",
        stroke: "#22c55e",
        width: 1.5,
        fill: "rgba(34,197,94,0.04)",
        paths: uPlot.paths.spline!(),
      },
      {
        label: "Combined",
        stroke: isDark ? "#e5e7eb" : "#18181b",
        width: 2,
        paths: uPlot.paths.spline!(),
      },
    ];

    const maxPsd = Math.max(...data.psd_xyz, 1);

    const opts: uPlot.Options = {
      width,
      height: 180,
      cursor: { show: false },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
      scales: {
        x: { range: [data.frequencies[0], data.frequencies[data.frequencies.length - 1]] },
        y: { range: [0, maxPsd * 1.15] },
      },
      axes: [
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: tickStroke, width: 1 },
          font: "10px system-ui",
          values: (_u: uPlot, vals: number[]) => vals.map((v) => `${v}`),
          label: "Hz",
          labelSize: 14,
          labelFont: "10px system-ui",
          gap: 2,
        },
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: tickStroke, width: 1 },
          font: "10px system-ui",
          size: 40,
          gap: 2,
        },
      ],
      series,
      hooks: {
        draw: [
          // Draw vertical line at shaper frequency
          (u: uPlot) => {
            if (shaperFreq <= 0) return;
            const ctx = u.ctx;
            const xPos = u.valToPos(shaperFreq, "x", true);
            const yMin = u.valToPos(0, "y", true);
            const yMax = u.valToPos(u.scales.y.max!, "y", true);
            ctx.save();
            ctx.strokeStyle = isDark ? "rgba(239,68,68,0.6)" : "rgba(220,38,38,0.5)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xPos, yMax);
            ctx.lineTo(xPos, yMin);
            ctx.stroke();
            // Label
            ctx.fillStyle = isDark ? "rgba(239,68,68,0.8)" : "rgba(220,38,38,0.7)";
            ctx.font = "bold 10px system-ui";
            ctx.textAlign = "center";
            ctx.fillText(`${shaperFreq.toFixed(1)} Hz`, xPos, yMax - 4);
            ctx.restore();
          },
        ],
      },
    };

    const plotData: uPlot.AlignedData = [
      data.frequencies,
      data.psd_x,
      data.psd_y,
      data.psd_z,
      data.psd_xyz,
    ];
    plotRef.current = new uPlot(opts, plotData, el);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [data, theme, shaperFreq]);

  // Resize handling
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!plotRef.current || !containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      if (width > 0) plotRef.current.setSize({ width, height: 180 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 h-[200px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading resonance data...</span>
      </div>
    );
  }

  if (noData) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2">
        <BarChart3 size={20} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">
          No resonance data available for {axis.toUpperCase()} axis.
        </p>
        <p className="text-[10px] text-muted-foreground text-center">
          Run calibration to generate frequency response data.
        </p>
        <Button variant="outline" size="xs" onClick={loadData}>
          <RefreshCw size={12} /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 pt-2 pb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {axis.toUpperCase()} Axis Resonance
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <LegendDot color="#3b82f6" label="X" />
          <LegendDot color="#f97316" label="Y" />
          <LegendDot color="#22c55e" label="Z" />
          <LegendDot color={theme === "dark" ? "#e5e7eb" : "#18181b"} label="All" />
        </div>
        <Button variant="ghost" size="icon-xs" onClick={loadData} title="Reload data">
          <RefreshCw size={10} />
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground px-3 pb-1 truncate">
        {data.filename}
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-0.5 rounded" style={{ backgroundColor: color }} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}
