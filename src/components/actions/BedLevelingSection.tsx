import { useState, useEffect, useCallback } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useGcode } from "@/hooks/use-gcode";
import { queryObjects } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Power, RotateCcw, RotateCw } from "lucide-react";
import type { SectionMode } from "./ActionsPage";

interface BedLimits {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const DEFAULT_LIMITS: BedLimits = { minX: 0, minY: 0, maxX: 235, maxY: 235 };
const Z_HOP = 10; // mm to raise before travel
const Z_PROBE = 0.1; // mm to lower to at corners
const TRAVEL_SPEED = 3000; // mm/min
const Z_SPEED = 600; // mm/min
const INSET = 30; // mm inset from bed edges

type PointCount = 3 | 4;

function getCorners(limits: BedLimits, inset: number): { label: string; x: number; y: number }[] {
  const x0 = limits.minX + inset;
  const x1 = limits.maxX - inset;
  const y0 = limits.minY + inset;
  const y1 = limits.maxY - inset;
  return [
    { label: "Front Left", x: x0, y: y0 },
    { label: "Front Right", x: x1, y: y0 },
    { label: "Back Right", x: x1, y: y1 },
    { label: "Back Left", x: x0, y: y1 },
  ];
}

type Rotation = 0 | 1 | 2 | 3; // 0°, 90°, 180°, 270° clockwise

const ROTATION_LABELS: Record<Rotation, [string, string, string]> = {
  0: ["Front Left", "Front Right", "Back Center"],
  1: ["Front Left", "Back Left", "Center Right"],
  2: ["Back Left", "Back Right", "Front Center"],
  3: ["Front Right", "Back Right", "Center Left"],
};

function getPoints(limits: BedLimits, inset: number, count: PointCount, rotation: Rotation = 0) {
  const corners = getCorners(limits, inset);
  if (count === 3) {
    const cx = (limits.minX + limits.maxX) / 2;
    const cy = (limits.minY + limits.maxY) / 2;
    const x0 = limits.minX + inset;
    const x1 = limits.maxX - inset;
    const y0 = limits.minY + inset;
    const y1 = limits.maxY - inset;
    const labels = ROTATION_LABELS[rotation];
    switch (rotation) {
      case 0: // flat edge at front, apex at back center
        return [
          { label: labels[0], x: x0, y: y0 },
          { label: labels[1], x: x1, y: y0 },
          { label: labels[2], x: cx, y: y1 },
        ];
      case 1: // flat edge at left, apex at center right
        return [
          { label: labels[0], x: x0, y: y0 },
          { label: labels[1], x: x0, y: y1 },
          { label: labels[2], x: x1, y: cy },
        ];
      case 2: // flat edge at back, apex at front center
        return [
          { label: labels[0], x: x0, y: y1 },
          { label: labels[1], x: x1, y: y1 },
          { label: labels[2], x: cx, y: y0 },
        ];
      case 3: // flat edge at right, apex at center left
        return [
          { label: labels[0], x: x1, y: y0 },
          { label: labels[1], x: x1, y: y1 },
          { label: labels[2], x: x0, y: cy },
        ];
    }
  }
  return corners;
}

// SVG bed diagram showing corners with active highlight
function BedDiagram({
  points,
  activeIndex,
  onPointClick,
  disabled,
}: {
  points: { label: string; x: number; y: number }[];
  activeIndex: number | null;
  onPointClick: (i: number) => void;
  disabled: boolean;
}) {
  // Normalize coordinates to 0-100 viewbox
  const allX = points.map((p) => p.x);
  const allY = points.map((p) => p.y);
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const pad = 15;
  const mapX = (x: number) => pad + ((x - xMin) / xRange) * (100 - 2 * pad);
  // Flip Y so front (low Y) is at bottom
  const mapY = (y: number) => (100 - pad) - ((y - yMin) / yRange) * (100 - 2 * pad);

  return (
    <svg viewBox="0 0 100 100" className="w-full aspect-square max-w-[200px] mx-auto">
      {/* Bed outline */}
      <rect x={pad - 5} y={pad - 5} width={100 - 2 * (pad - 5)} height={100 - 2 * (pad - 5)}
        rx="4" fill="none" className="stroke-border" strokeWidth="1" />

      {/* Connection lines */}
      <polygon
        points={points.map((p) => `${mapX(p.x)},${mapY(p.y)}`).join(" ")}
        fill="none" className="stroke-muted-foreground" strokeWidth="0.5" strokeDasharray="2,2"
      />

      {/* Points */}
      {points.map((p, i) => {
        const cx = mapX(p.x);
        const cy = mapY(p.y);
        const isActive = i === activeIndex;
        return (
          <g key={i}>
            <circle
              cx={cx} cy={cy} r={isActive ? 6 : 4.5}
              className={`cursor-pointer transition-colors ${
                isActive ? "fill-primary stroke-primary" : "fill-muted-foreground/30 stroke-muted-foreground"
              }`}
              strokeWidth={isActive ? 1.5 : 1}
              onClick={() => !disabled && onPointClick(i)}
            />
            <text
              x={cx} y={cy - 8} textAnchor="middle"
              className="fill-muted-foreground" fontSize="5" fontWeight={isActive ? "bold" : "normal"}
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* "FRONT" label at bottom */}
      <text x="50" y="98" textAnchor="middle" className="fill-muted-foreground" fontSize="4">
        FRONT
      </text>
    </svg>
  );
}

export function BedLevelingSection({ mode: _mode }: { mode: SectionMode }) {
  const { send, busy } = useGcode();
  const homedAxes = usePrinterStore((s) => s.toolhead.homed_axes);
  const connected = usePrinterStore((s) => s.klippyState) === "ready";
  const allHomed = homedAxes.includes("x") && homedAxes.includes("y") && homedAxes.includes("z");

  const [limits, setLimits] = useState<BedLimits>(DEFAULT_LIMITS);
  const [limitsLoaded, setLimitsLoaded] = useState(false);
  const [pointCount, setPointCount] = useState<PointCount>(4);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [inset, setInset] = useState(INSET);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [keypad, setKeypad] = useState<{
    title: string; value: number; min: number; max: number; unit: string;
    onSubmit: (v: number) => void;
  } | null>(null);

  // Try to auto-detect bed size from printer config
  useEffect(() => {
    if (!connected || limitsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await queryObjects({ configfile: ["config"] });
        const config = (result.status?.configfile as { config?: Record<string, Record<string, string>> })?.config;
        if (cancelled || !config) return;

        const stepper_x = config["stepper_x"];
        const stepper_y = config["stepper_y"];
        if (stepper_x && stepper_y) {
          const newLimits: BedLimits = {
            minX: parseFloat(stepper_x.position_min) || 0,
            maxX: parseFloat(stepper_x.position_max) || DEFAULT_LIMITS.maxX,
            minY: parseFloat(stepper_y.position_min) || 0,
            maxY: parseFloat(stepper_y.position_max) || DEFAULT_LIMITS.maxY,
          };
          setLimits(newLimits);
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLimitsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [connected, limitsLoaded]);

  const points = getPoints(limits, inset, pointCount, rotation);

  const goToPoint = useCallback((index: number) => {
    const p = getPoints(limits, inset, pointCount, rotation)[index];
    if (!p) return;
    setActivePoint(index);
    send([
      `G1 Z${Z_HOP} F${Z_SPEED}`,
      `G1 X${p.x.toFixed(1)} Y${p.y.toFixed(1)} F${TRAVEL_SPEED}`,
      `G1 Z${Z_PROBE} F${Z_SPEED}`,
    ].join("\n"));
  }, [limits, inset, pointCount, rotation, send]);

  const runSequence = useCallback(() => {
    const pts = getPoints(limits, inset, pointCount, rotation);
    const commands = ["G28"];
    for (const p of pts) {
      commands.push(`G1 Z${Z_HOP} F${Z_SPEED}`);
      commands.push(`G1 X${p.x.toFixed(1)} Y${p.y.toFixed(1)} F${TRAVEL_SPEED}`);
      commands.push(`G1 Z${Z_PROBE} F${Z_SPEED}`);
    }
    setActivePoint(0);
    send(commands.join("\n"));
  }, [limits, inset, pointCount, rotation, send]);

  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant={allHomed ? "secondary" : "default"}
            className="h-10 text-xs"
            disabled={busy || !connected}
            onClick={() => send("G28")}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Home size={14} />}
            Home All
          </Button>
          <Button
            variant="outline"
            className="h-10 text-xs"
            disabled={busy || !connected || !allHomed}
            onClick={runSequence}
          >
            <RotateCcw size={14} />
            Run All
          </Button>
          <Button
            variant="outline"
            className="h-10 text-xs text-destructive"
            disabled={!connected}
            onClick={() => send("M84")}
          >
            <Power size={14} />
            Motors Off
          </Button>
        </div>
      </Card>

      {/* Point count toggle + inset */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Leveling Points</div>
          <div className="flex gap-1">
            {([3, 4] as PointCount[]).map((n) => (
              <Button
                key={n}
                variant={pointCount === n ? "default" : "secondary"}
                size="xs"
                onClick={() => { setPointCount(n); setRotation(0); setActivePoint(null); }}
              >
                {n}-Point
              </Button>
            ))}
            {pointCount === 3 && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => { setRotation((r) => ((r + 1) % 4) as Rotation); setActivePoint(null); }}
              >
                <RotateCw size={14} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Edge inset</span>
          <button
            className="text-sm font-bold tabular-nums active:text-primary transition-colors"
            onClick={() => setKeypad({
              title: "Edge Inset",
              value: inset,
              min: 5,
              max: Math.min(limits.maxX, limits.maxY) / 2 - 5,
              unit: "mm",
              onSubmit: (v) => { setInset(v); setKeypad(null); },
            })}
          >
            {inset} mm
          </button>
        </div>

        {/* Visual bed diagram */}
        <BedDiagram
          points={points}
          activeIndex={activePoint}
          onPointClick={(i) => allHomed && goToPoint(i)}
          disabled={busy || !allHomed}
        />
      </Card>

      {/* Corner buttons */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Go To Point</div>
        <div className={`grid gap-1.5 ${pointCount === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {points.map((p, i) => (
            <Button
              key={i}
              variant={activePoint === i ? "default" : "outline"}
              className="h-12 text-xs flex-col gap-0.5"
              disabled={busy || !connected || !allHomed}
              onClick={() => goToPoint(i)}
            >
              <span>{p.label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ({p.x.toFixed(0)}, {p.y.toFixed(0)})
              </span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Bed info */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Bed Size</div>
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="X Range" value={`${limits.minX} – ${limits.maxX} mm`} />
          <StatBox label="Y Range" value={`${limits.minY} – ${limits.maxY} mm`} />
          <StatBox label="Z Hop" value={`${Z_HOP} mm`} />
          <StatBox label="Z Probe" value={`${Z_PROBE} mm`} />
        </div>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Adjust each corner knob until paper drags evenly. Repeat until consistent.
      </p>

      {keypad && (
        <NumericKeypad
          title={keypad.title}
          initialValue={keypad.value}
          unit={keypad.unit}
          min={keypad.min}
          max={keypad.max}
          onSubmit={keypad.onSubmit}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl px-3 py-2.5">{children}</div>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
