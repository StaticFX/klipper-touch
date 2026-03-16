import { useMemo, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import { useCanvas3D } from "@/hooks/use-canvas-3d";
import { Grid3X3, RefreshCw, Loader2 } from "lucide-react";

/* ── Color helpers ─────────────────────────────────────── */

type RGB = [number, number, number];

function lerp3(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

function zColor(z: number, absMax: number, dark: boolean): RGB {
  if (absMax === 0) return dark ? [50, 50, 55] : [230, 230, 235];
  const t = Math.max(-1, Math.min(1, z / absMax));
  const blue: RGB = dark ? [59, 130, 246] : [96, 165, 250];
  const neutral: RGB = dark ? [55, 55, 60] : [230, 230, 235];
  const red: RGB = dark ? [239, 68, 68] : [248, 113, 113];
  if (t < 0) return lerp3(blue, neutral, 1 + t);
  return lerp3(neutral, red, t);
}

/* ── 3D projection ─────────────────────────────────────── */

interface Pt2 { x: number; y: number; depth: number }

function makeProjector(w: number, h: number, rotZ: number, elev: number) {
  const scale = Math.min(w, h) * 0.54;
  const cx = w * 0.5;
  const cy = h * 0.50;
  const cosA = Math.cos(rotZ);
  const sinA = Math.sin(rotZ);
  const cosE = Math.cos(elev);
  const sinE = Math.sin(elev);

  return function project(x: number, y: number, z: number): Pt2 {
    const xc = x - 0.5;
    const yc = y - 0.5;
    const rx = xc * cosA - yc * sinA;
    const ry = xc * sinA + yc * cosA;
    const fy = ry * cosE - z * sinE;
    const depth = ry * sinE + z * cosE;
    return { x: rx * scale + cx, y: -fy * scale + cy, depth };
  };
}

/* ── Canvas renderer ───────────────────────────────────── */

interface MeshMeta {
  meshMin: [number, number];
  meshMax: [number, number];
}

function drawMesh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  matrix: number[][],
  dark: boolean,
  rotZ: number,
  elev: number,
  zExaggeration: number,
  meta: MeshMeta,
) {
  ctx.clearRect(0, 0, w, h);

  const rows = matrix.length;
  const cols = matrix[0].length;
  const flat = matrix.flat();
  const minZ = Math.min(...flat);
  const maxZ = Math.max(...flat);
  const absMax = Math.max(Math.abs(minZ), Math.abs(maxZ));

  const baseZScale = absMax > 0 ? 0.005 : 1;
  const zScale = baseZScale * zExaggeration;

  const project = makeProjector(w, h, rotZ, elev);

  const wireColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const edgeColor = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.20)";
  const floorColor = dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)";
  const floorLine = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const pillarColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const labelColor = dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
  const labelBg = dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";
  const axisColor = dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";

  function labelWithBg(
    text: string,
    x: number,
    y: number,
    align: CanvasTextAlign,
    baseline: CanvasTextBaseline,
  ) {
    ctx.font = `600 ${fontSize}px ui-monospace, monospace`;
    const m = ctx.measureText(text);
    const padX = 4, padY = 2;
    const tw = m.width;
    const th = fontSize;
    let rx = x;
    if (align === "center") rx = x - tw / 2;
    else if (align === "right") rx = x - tw;
    let ry = y;
    if (baseline === "middle") ry = y - th / 2;
    else if (baseline === "bottom") ry = y - th;

    ctx.fillStyle = labelBg;
    const r = 3;
    const bx = rx - padX, by = ry - padY, bw = tw + padX * 2, bh = th + padY * 2;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
    ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = labelColor;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
  }

  const floorZ = -0.12;

  // ── Floor reference plane ──
  const fc = [
    project(0, 0, floorZ), project(1, 0, floorZ),
    project(1, 1, floorZ), project(0, 1, floorZ),
  ];
  ctx.beginPath();
  ctx.moveTo(fc[0].x, fc[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(fc[i].x, fc[i].y);
  ctx.closePath();
  ctx.fillStyle = floorColor;
  ctx.fill();

  // Floor grid
  ctx.strokeStyle = floorLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= cols - 1; i++) {
    const t = i / (cols - 1);
    const a = project(t, 0, floorZ), b = project(t, 1, floorZ);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let i = 0; i <= rows - 1; i++) {
    const t = i / (rows - 1);
    const a = project(0, t, floorZ), b = project(1, t, floorZ);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // ── Vertical pillars at corners ──
  ctx.strokeStyle = pillarColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (const [cx, cy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const r = cy === 0 ? 0 : rows - 1;
    const c = cx === 0 ? 0 : cols - 1;
    const sz = matrix[r][c] * zScale;
    const bottom = project(cx, cy, floorZ);
    const top = project(cx, cy, sz);
    ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── Surface quads ──
  const quads: { pts: Pt2[]; color: RGB; depth: number }[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const x0 = c / (cols - 1), x1 = (c + 1) / (cols - 1);
      const y0 = r / (rows - 1), y1 = (r + 1) / (rows - 1);
      const z00 = matrix[r][c], z10 = matrix[r][c + 1];
      const z01 = matrix[r + 1][c], z11 = matrix[r + 1][c + 1];
      const avgZ = (z00 + z10 + z01 + z11) / 4;
      const p00 = project(x0, y0, z00 * zScale);
      const p10 = project(x1, y0, z10 * zScale);
      const p01 = project(x0, y1, z01 * zScale);
      const p11 = project(x1, y1, z11 * zScale);
      const depth = (p00.depth + p10.depth + p01.depth + p11.depth) / 4;
      quads.push({ pts: [p00, p10, p11, p01], color: zColor(avgZ, absMax, dark), depth });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  for (const q of quads) {
    ctx.beginPath();
    ctx.moveTo(q.pts[0].x, q.pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(q.pts[i].x, q.pts[i].y);
    ctx.closePath();
    ctx.fillStyle = rgb(q.color);
    ctx.fill();
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Surface outline ──
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.5;
  const edges: [number, number, number][][] = [
    Array.from({ length: cols }, (_, c) => [c / (cols - 1), 0, matrix[0][c] * zScale]),
    Array.from({ length: rows }, (_, r) => [1, r / (rows - 1), matrix[r][cols - 1] * zScale]),
    Array.from({ length: cols }, (_, i) => {
      const c = cols - 1 - i;
      return [c / (cols - 1), 1, matrix[rows - 1][c] * zScale];
    }),
    Array.from({ length: rows }, (_, i) => {
      const r = rows - 1 - i;
      return [0, r / (rows - 1), matrix[r][0] * zScale];
    }),
  ];
  for (const edge of edges) {
    ctx.beginPath();
    edge.forEach(([x, y, z], i) => {
      const p = project(x, y, z);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  // ── Axis labels ──
  const xLen = meta.meshMax[0] - meta.meshMin[0];
  const yLen = meta.meshMax[1] - meta.meshMin[1];
  const fontSize = Math.max(9, Math.min(11, w * 0.018));

  const floorCorners = [
    { label: "00", ...project(0, 0, floorZ) },
    { label: "10", ...project(1, 0, floorZ) },
    { label: "11", ...project(1, 1, floorZ) },
    { label: "01", ...project(0, 1, floorZ) },
  ];

  const center = {
    x: (floorCorners[0].x + floorCorners[1].x + floorCorners[2].x + floorCorners[3].x) / 4,
    y: (floorCorners[0].y + floorCorners[1].y + floorCorners[2].y + floorCorners[3].y) / 4,
  };

  const xEdge1Mid = { x: (floorCorners[0].x + floorCorners[1].x) / 2, y: (floorCorners[0].y + floorCorners[1].y) / 2 };
  const xEdge2Mid = { x: (floorCorners[3].x + floorCorners[2].x) / 2, y: (floorCorners[3].y + floorCorners[2].y) / 2 };
  const xMid = xEdge1Mid.y >= xEdge2Mid.y ? xEdge1Mid : xEdge2Mid;
  const xOffY = xMid.y > center.y ? 22 : -22;
  labelWithBg(`X · ${xLen.toFixed(0)} mm`, xMid.x, xMid.y + xOffY, "center", xOffY > 0 ? "top" : "bottom");

  const yEdge1Mid = { x: (floorCorners[0].x + floorCorners[3].x) / 2, y: (floorCorners[0].y + floorCorners[3].y) / 2 };
  const yEdge2Mid = { x: (floorCorners[1].x + floorCorners[2].x) / 2, y: (floorCorners[1].y + floorCorners[2].y) / 2 };
  const yMid = yEdge1Mid.x <= yEdge2Mid.x ? yEdge1Mid : yEdge2Mid;
  const yOffX = yMid.x < center.x ? -18 : 18;
  labelWithBg(`Y · ${yLen.toFixed(0)} mm`, yMid.x + yOffX, yMid.y, yOffX < 0 ? "right" : "left", "middle");

  const cornerCoords: Record<string, [number, number]> = { "00": [0, 0], "10": [1, 0], "11": [1, 1], "01": [0, 1] };
  const zCorner = [...floorCorners].sort((a, b) => b.y - a.y)[0];
  const [zcx, zcy] = cornerCoords[zCorner.label];
  const zTop = project(zcx, zcy, maxZ * zScale);
  const zNeg = project(zcx, zcy, minZ * zScale);

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(zNeg.x, zNeg.y); ctx.lineTo(zTop.x, zTop.y); ctx.stroke();

  const zSide = zCorner.x < center.x ? -1 : 1;
  const zTicks = absMax > 0 ? [minZ, 0, maxZ] : [0];
  for (const zv of zTicks) {
    const p = project(zcx, zcy, zv * zScale);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + zSide * 5, p.y);
    ctx.strokeStyle = axisColor;
    ctx.stroke();
    labelWithBg(
      `${zv >= 0 ? "+" : ""}${zv.toFixed(2)}`,
      p.x + zSide * 8,
      p.y,
      zSide < 0 ? "right" : "left",
      "middle",
    );
  }

  // ── Scale indicator ──
  ctx.fillStyle = labelColor;
  ctx.font = `${Math.max(9, Math.min(11, w * 0.016))}px ui-monospace, monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`Z scale: ${zExaggeration}x`, w - 8, h - 6);
}

/* ── Component ─────────────────────────────────────────── */

const DEFAULT_ROT = Math.PI * 0.22;
const DEFAULT_ELEV = Math.PI * 0.16;
const SCALE_PRESETS = [1, 10, 50, 100, 200];

export function BedMeshSection({ mode: _mode }: { mode: "controls" | "settings" }) {
  const { send, busy } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);
  const mesh = usePrinterStore((s) => s.bedMesh);
  const theme = useUiStore((s) => s.theme);
  const isDark = theme === "dark";
  const [zExaggeration, setZExaggeration] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!mesh?.mesh_matrix?.length) return null;
    const flat = mesh.mesh_matrix.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
    const range = max - min;
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    return { min, max, mean, range, absMax };
  }, [mesh?.mesh_matrix]);

  const meta: MeshMeta = useMemo(() => ({
    meshMin: mesh?.mesh_min ?? [0, 0],
    meshMax: mesh?.mesh_max ?? [0, 0],
  }), [mesh?.mesh_min, mesh?.mesh_max]);

  const draw = useCallback((rotation: number, elevation: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !mesh?.mesh_matrix?.length) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.width * 0.65;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    drawMesh(ctx, w, h, mesh.mesh_matrix, isDark, rotation, elevation, zExaggeration, meta);
  }, [canvasRef, containerRef, mesh?.mesh_matrix, isDark, zExaggeration, meta]);

  const { resetView } = useCanvas3D({
    canvasRef,
    containerRef,
    draw,
    defaultRotation: DEFAULT_ROT,
    defaultElevation: DEFAULT_ELEV,
  });

  const handleCalibrate = () => {
    showConfirm({
      title: "Bed Mesh Calibrate",
      message: "Run automatic bed mesh calibration? Printer must be homed first.",
      onConfirm: () => send("BED_MESH_CALIBRATE"),
    });
  };

  if (!mesh?.mesh_matrix?.length || !stats) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Grid3X3 size={32} className="text-muted-foreground" />
          <div className="text-sm text-muted-foreground text-center">
            No bed mesh data available
          </div>
          <Button variant="default" className="h-11" disabled={busy} onClick={handleCalibrate}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {busy ? "Calibrating…" : "Run Bed Mesh Calibrate"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {mesh.profile_name || "Active Mesh"}
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" className="h-9 text-xs px-2" onClick={resetView}>
            Reset View
          </Button>
          <Button variant="outline" className="h-9 text-xs" disabled={busy} onClick={handleCalibrate}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {busy ? "Calibrating…" : "Recalibrate"}
          </Button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div
        ref={containerRef}
        className="rounded-xl border border-border overflow-hidden bg-card touch-none"
      >
        <canvas ref={canvasRef} className="block w-full cursor-grab active:cursor-grabbing" />
      </div>

      {/* Z Scale selector */}
      <div>
        <div className="text-[11px] text-muted-foreground mb-1">Z Exaggeration</div>
        <div className="grid grid-cols-3 landscape:flex gap-1.5">
          {SCALE_PRESETS.map((s) => (
            <Button
              key={s}
              variant={zExaggeration === s ? "default" : "outline"}
              className="landscape:flex-1 h-9 text-xs"
              onClick={() => setZExaggeration(s)}
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden flex">
          {Array.from({ length: 20 }, (_, i) => {
            const t = (i / 19) * 2 - 1;
            const c = zColor(t * stats.absMax, stats.absMax, isDark);
            return (
              <div key={i} className="flex-1 h-full" style={{ backgroundColor: rgb(c) }} />
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 landscape:grid-cols-4 gap-2">
        <StatBox label="Min" value={stats.min.toFixed(3)} unit="mm" />
        <StatBox label="Max" value={stats.max.toFixed(3)} unit="mm" />
        <StatBox label="Range" value={stats.range.toFixed(3)} unit="mm" />
        <StatBox label="Mean" value={stats.mean.toFixed(3)} unit="mm" />
      </div>
    </div>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold font-mono tabular-nums">
        {value}
        <span className="text-muted-foreground font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
