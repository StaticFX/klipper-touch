import { useRef, useEffect, useCallback, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useUiStore } from "@/stores/ui-store";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3 } from "lucide-react";

export interface ShaperResult {
  name: string;       // e.g. "zv", "mzv", "ei"
  freq: number;       // recommended frequency from header
  shaped_psd: number[]; // psd_xyz * shaper_response at each frequency point
  vibrs: number;      // total remaining vibration (sum of shaped_psd)
}

export interface ResonanceData {
  axis: "x" | "y";
  frequencies: number[];
  psd_x: number[];
  psd_y: number[];
  psd_z: number[];
  psd_xyz: number[];
  shapers: ShaperResult[];
  filename: string;
}

// Matches headers like "zv(129.4)" or "2hump_ei(101.2)"
const SHAPER_COL_RE = /^([a-z0-9_]+)\(([0-9.]+)\)$/;

function parseResonanceCsv(csv: string): Omit<ResonanceData, "axis" | "filename"> | null {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;

  const rawCols = lines[0].split(",").map((c) => c.trim());
  const cols = rawCols.map((c) => c.toLowerCase());
  const freqIdx = cols.indexOf("freq");
  const psdXIdx = cols.indexOf("psd_x");
  const psdYIdx = cols.indexOf("psd_y");
  const psdZIdx = cols.indexOf("psd_z");
  const psdXyzIdx = cols.indexOf("psd_xyz");

  if (freqIdx < 0 || psdXyzIdx < 0) return null;

  // Detect shaper columns
  const shaperCols: { name: string; freq: number; idx: number }[] = [];
  for (let c = 0; c < cols.length; c++) {
    const m = cols[c].match(SHAPER_COL_RE);
    if (m) shaperCols.push({ name: m[1], freq: parseFloat(m[2]), idx: c });
  }

  const frequencies: number[] = [];
  const psd_x: number[] = [];
  const psd_y: number[] = [];
  const psd_z: number[] = [];
  const psd_xyz: number[] = [];
  const shaperResponses: number[][] = shaperCols.map(() => []);

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length <= freqIdx) continue;
    const freq = parseFloat(parts[freqIdx]);
    if (isNaN(freq)) continue;

    frequencies.push(freq);
    const psdVal = parseFloat(parts[psdXyzIdx]) || 0;
    psd_x.push(psdXIdx >= 0 ? parseFloat(parts[psdXIdx]) || 0 : 0);
    psd_y.push(psdYIdx >= 0 ? parseFloat(parts[psdYIdx]) || 0 : 0);
    psd_z.push(psdZIdx >= 0 ? parseFloat(parts[psdZIdx]) || 0 : 0);
    psd_xyz.push(psdVal);

    for (let s = 0; s < shaperCols.length; s++) {
      const response = parseFloat(parts[shaperCols[s].idx]) || 0;
      shaperResponses[s].push(psdVal * response);
    }
  }

  if (frequencies.length === 0) return null;

  const shapers: ShaperResult[] = shaperCols.map((sc, i) => ({
    name: sc.name,
    freq: sc.freq,
    shaped_psd: shaperResponses[i],
    vibrs: shaperResponses[i].reduce((a, b) => a + b, 0),
  }));

  return { frequencies, psd_x, psd_y, psd_z, psd_xyz, shapers };
}

const SEARCH_DIRS = ["/tmp", "/home/pi/printer_data/config"];
const FILE_PREFIXES = ["resonances_", "calibration_data_"];

async function fetchResonanceFiles(): Promise<ResonanceData[]> {
  const results: ResonanceData[] = [];
  const seen = new Set<"x" | "y">();

  for (const dir of SEARCH_DIRS) {
    for (const prefix of FILE_PREFIXES) {
      try {
        const files = await invoke<string[]>("list_local_files", { dir, prefix, suffix: ".csv" });
        // Sort descending so most recent (by name) comes first
        files.sort().reverse();
        for (const filePath of files) {
          const name = filePath.split("/").pop() ?? "";
          const axis: "x" | "y" = name.includes("_x") ? "x" : "y";
          if (seen.has(axis)) continue;
          try {
            const csv = await invoke<string>("read_text_file", { path: filePath });
            const parsed = parseResonanceCsv(csv);
            if (parsed) {
              seen.add(axis);
              results.push({ ...parsed, axis, filename: name });
            }
          } catch {
            // skip unreadable files
          }
          if (seen.size >= 2) return results;
        }
      } catch {
        // dir doesn't exist or not readable
      }
    }
  }
  return results;
}

interface ShaperGraphProps {
  axis: "x" | "y";
  shaperFreq: number;
  onApplyShaper?: (shaperType: string, freq: number) => void;
}

const SHAPER_COLORS = [
  "#ef4444", // red
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
];

export function ShaperGraph({ axis, shaperFreq, onApplyShaper }: ShaperGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const theme = useUiStore((s) => s.theme);
  const [data, setData] = useState<ResonanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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

  // Highlighted shaper is whatever the user tapped
  const highlighted = data?.shapers.find((s) => s.name === selected) ?? null;
  // Total original vibration for percentage calc
  const totalVibrs = data?.psd_xyz.reduce((a, b) => a + b, 0) ?? 0;

  // Build the plot when data, theme, or selection changes
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
        width: 1,
        paths: uPlot.paths.spline!(),
      },
      {
        label: "PSD Y",
        stroke: "#f97316",
        width: 1,
        paths: uPlot.paths.spline!(),
      },
      {
        label: "PSD Z",
        stroke: "#22c55e",
        width: 1,
        paths: uPlot.paths.spline!(),
      },
      {
        label: "Combined",
        stroke: isDark ? "#e5e7eb" : "#18181b",
        width: 2,
        paths: uPlot.paths.spline!(),
      },
      // Shaper shaped-PSD series
      ...data.shapers.map((s, i) => {
        const isHighlighted = s === highlighted;
        const hasSelection = highlighted !== null;
        const color = SHAPER_COLORS[i % SHAPER_COLORS.length];
        return {
          label: s.name.toUpperCase(),
          stroke: !hasSelection ? color : isHighlighted ? color : `${color}33`,
          width: !hasSelection ? 1.5 : isHighlighted ? 2.5 : 0.75,
          dash: isHighlighted || !hasSelection ? undefined : [6, 3] as number[],
          paths: uPlot.paths.spline!(),
        };
      }),
    ];

    const maxPsd = Math.max(...data.psd_xyz, 1);

    const opts: uPlot.Options = {
      width,
      height: 300,
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
          size: 55,
          gap: 2,
          values: (_u: uPlot, vals: number[]) => vals.map((v) => {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
            if (v >= 1) return v.toFixed(0);
            return v.toFixed(3);
          }),
        },
      ],
      series,
      hooks: {
        draw: [
          (u: uPlot) => {
            const ctx = u.ctx;
            const yMin = u.valToPos(0, "y", true);
            const yMax = u.valToPos(u.scales.y.max!, "y", true);

            // Active shaper freq from Klipper config
            if (shaperFreq > 0) {
              const xPos = u.valToPos(shaperFreq, "x", true);
              ctx.save();
              ctx.strokeStyle = isDark ? "rgba(239,68,68,0.6)" : "rgba(220,38,38,0.5)";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(xPos, yMax);
              ctx.lineTo(xPos, yMin);
              ctx.stroke();
              ctx.fillStyle = isDark ? "rgba(239,68,68,0.8)" : "rgba(220,38,38,0.7)";
              ctx.font = "bold 10px system-ui";
              ctx.textAlign = "center";
              ctx.fillText(`Active: ${shaperFreq.toFixed(1)} Hz`, xPos, yMax - 4);
              ctx.restore();
            }

            // Selected/best shaper vertical line
            if (highlighted) {
              const xPos = u.valToPos(highlighted.freq, "x", true);
              const color = SHAPER_COLORS[data.shapers.indexOf(highlighted) % SHAPER_COLORS.length];
              ctx.save();
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.moveTo(xPos, yMax);
              ctx.lineTo(xPos, yMin);
              ctx.stroke();
              ctx.fillStyle = color;
              ctx.font = "bold 10px system-ui";
              ctx.textAlign = "center";
              ctx.fillText(`${highlighted.name.toUpperCase()} ${highlighted.freq.toFixed(1)} Hz`, xPos, yMin + 12);
              ctx.restore();
            }
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
      ...data.shapers.map((s) => s.shaped_psd),
    ];
    plotRef.current = new uPlot(opts, plotData, el);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [data, theme, shaperFreq, highlighted]);

  // Resize handling
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!plotRef.current || !containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      if (width > 0) plotRef.current.setSize({ width, height: 300 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 h-[340px] flex items-center justify-center">
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
      <div className="flex items-center gap-3 px-3 pt-2 pb-1 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {axis.toUpperCase()} Axis Resonance
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
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
      {/* Shaper selector */}
      {data.shapers.length > 0 && (
        <div className="px-3 pb-2 pt-1 space-y-1.5">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.shapers.length}, 1fr)` }}>
            {data.shapers.map((s, i) => {
              const isSelected = s === highlighted;
              const vibrPct = totalVibrs > 0 ? (s.vibrs / totalVibrs) * 100 : 0;
              return (
                <button
                  key={s.name}
                  type="button"
                  className={`rounded-lg px-1.5 py-1.5 text-center transition-all ${
                    isSelected
                      ? "ring-2 ring-primary bg-primary/15 scale-[1.02]"
                      : "bg-muted/50 hover:bg-muted/80"
                  }`}
                  onClick={() => setSelected(s.name === selected ? null : s.name)}
                >
                  <div className="text-[9px] uppercase tracking-wider font-medium" style={{ color: SHAPER_COLORS[i % SHAPER_COLORS.length] }}>
                    {s.name}
                  </div>
                  <div className="text-xs font-bold tabular-nums">{s.freq.toFixed(1)} Hz</div>
                  <div className="text-[9px] text-muted-foreground tabular-nums">
                    {vibrPct.toFixed(1)}% vibr
                  </div>
                </button>
              );
            })}
          </div>
          {highlighted && onApplyShaper && (
            <Button
              variant="default"
              className="w-full h-9"
              onClick={() => onApplyShaper(highlighted.name, highlighted.freq)}
            >
              Apply {highlighted.name.toUpperCase()} @ {highlighted.freq.toFixed(1)} Hz to {axis.toUpperCase()} axis
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, bold }: { color: string; label: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`${bold ? "w-3 h-1" : "w-2 h-0.5"} rounded`} style={{ backgroundColor: color }} />
      <span className={`text-[9px] ${bold ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
