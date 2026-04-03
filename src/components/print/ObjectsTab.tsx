import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useUiStore } from "@/stores/ui-store";
import { excludeObject } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

interface ObjectBounds {
  name: string;
  center: [number, number];
  polygon?: [number, number][];
}

export function ObjectsTab() {
  const excludeObj = usePrinterStore((s) => s.excludeObject);
  const bedMesh = usePrinterStore((s) => s.bedMesh);
  const showConfirm = useUiStore((s) => s.showConfirm);
  const [selected, setSelected] = useState<string | null>(null);

  const objects = excludeObj.objects;
  const hasPositionData = objects.some((o) => o.center);

  const handleExclude = (name: string) => {
    showConfirm({
      title: "Exclude Object",
      message: `Stop printing "${name}"? This cannot be undone.`,
      onConfirm: () => excludeObject(name),
    });
    setSelected(null);
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No objects detected in this print.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Build plate canvas */}
      {hasPositionData && (
        <BuildPlateCanvas
          objects={objects as ObjectBounds[]}
          excluded={excludeObj.excluded_objects}
          current={excludeObj.current_object}
          selected={selected}
          bedMin={bedMesh?.mesh_min}
          bedMax={bedMesh?.mesh_max}
          onSelect={setSelected}
        />
      )}

      {/* Object list */}
      <div className="space-y-1">
        {objects.map((obj) => {
          const isExcluded = excludeObj.excluded_objects.includes(obj.name);
          const isCurrent = excludeObj.current_object === obj.name;
          const isSelected = selected === obj.name;
          return (
            <div
              key={obj.name}
              className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors ${
                isSelected ? "bg-primary/10 border border-primary/30" :
                isCurrent ? "bg-primary/5 border border-border" :
                "bg-card border border-border"
              }`}
              onClick={() => !isExcluded && setSelected(isSelected ? null : obj.name)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isCurrent && <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                <span className={`text-xs truncate ${isExcluded ? "line-through text-muted-foreground" : ""}`}>
                  {obj.name}
                </span>
              </div>
              {isExcluded ? (
                <span className="text-[10px] text-muted-foreground shrink-0">Excluded</span>
              ) : (
                <Button variant="destructive-subtle" size="xs" onClick={(e) => {
                  e.stopPropagation();
                  handleExclude(obj.name);
                }}>
                  <Ban size={12} /> Exclude
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {hasPositionData && (
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/40" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/40" /> Excluded</span>
        </div>
      )}
    </div>
  );
}

function BuildPlateCanvas({ objects, excluded, current, selected, bedMin, bedMax, onSelect }: {
  objects: ObjectBounds[];
  excluded: string[];
  current: string | null;
  selected: string | null;
  bedMin?: [number, number];
  bedMax?: [number, number];
  onSelect: (name: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute bed bounds from mesh or object extents
  const bMin = useMemo(() => bedMin ?? [0, 0] as [number, number], [bedMin]);
  const bMax = useMemo(() => bedMax ?? [235, 235] as [number, number], [bedMax]);
  const bedW = bMax[0] - bMin[0];
  const bedH = bMax[1] - bMin[1];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = Math.min(w * (bedH / bedW), 280);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padding = 16;
    const scaleX = (w - padding * 2) / bedW;
    const scaleY = (h - padding * 2) / bedH;
    const scale = Math.min(scaleX, scaleY);
    const offX = (w - bedW * scale) / 2;
    const offY = (h - bedH * scale) / 2;

    const toCanvas = (x: number, y: number): [number, number] => [
      offX + (x - bMin[0]) * scale,
      offY + (bedH - (y - bMin[1])) * scale, // flip Y
    ];

    // Draw bed outline
    const [blX, blY] = toCanvas(bMin[0], bMin[1]);
    const [trX, trY] = toCanvas(bMax[0], bMax[1]);
    ctx.strokeStyle = getComputedColor("--border");
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.min(blX, trX), Math.min(blY, trY), Math.abs(trX - blX), Math.abs(trY - blY));

    // Draw objects
    for (const obj of objects) {
      if (!obj.center) continue;
      const isExcluded = excluded.includes(obj.name);
      const isCurrent = current === obj.name;
      const isSelected = selected === obj.name;

      let fillColor: string;
      let strokeColor: string;
      if (isExcluded) {
        fillColor = "rgba(220, 38, 38, 0.15)";
        strokeColor = "rgba(220, 38, 38, 0.5)";
      } else if (isCurrent) {
        fillColor = getComputedColor("--primary", 0.3);
        strokeColor = getComputedColor("--primary", 0.8);
      } else if (isSelected) {
        fillColor = getComputedColor("--primary", 0.2);
        strokeColor = getComputedColor("--primary", 0.6);
      } else {
        fillColor = getComputedColor("--foreground", 0.08);
        strokeColor = getComputedColor("--foreground", 0.3);
      }

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected || isCurrent ? 2 : 1;

      if (obj.polygon && obj.polygon.length > 2) {
        ctx.beginPath();
        const [sx, sy] = toCanvas(obj.polygon[0][0], obj.polygon[0][1]);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < obj.polygon.length; i++) {
          const [px, py] = toCanvas(obj.polygon[i][0], obj.polygon[i][1]);
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const [cx, cy] = toCanvas(obj.center[0], obj.center[1]);
        const r = Math.max(8, scale * 5);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Label
      if (isCurrent || isSelected) {
        const [cx, cy] = toCanvas(obj.center[0], obj.center[1]);
        ctx.fillStyle = getComputedColor("--foreground", 0.8);
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(obj.name, cx, cy - (obj.polygon ? 12 : 14));
      }
    }
  }, [objects, excluded, current, selected, bMin, bMax, bedW, bedH]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const handleTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 16;
    const w = rect.width;
    const h = rect.height;
    const scaleX = (w - padding * 2) / bedW;
    const scaleY = (h - padding * 2) / bedH;
    const scale = Math.min(scaleX, scaleY);
    const offX = (w - bedW * scale) / 2;
    const offY = (h - bedH * scale) / 2;

    // Find closest object within tap distance
    let closest: string | null = null;
    let closestDist = 30; // max tap distance in px
    for (const obj of objects) {
      if (!obj.center || excluded.includes(obj.name)) continue;
      const cx = offX + (obj.center[0] - bMin[0]) * scale;
      const cy = offY + (bedH - (obj.center[1] - bMin[1])) * scale;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = obj.name;
      }
    }
    onSelect(closest === selected ? null : closest);
  };

  return (
    <div ref={containerRef} className="bg-card border border-border rounded-xl overflow-hidden">
      <canvas ref={canvasRef} onClick={handleTap} className="w-full touch-none" />
    </div>
  );
}

function getComputedColor(varName: string, alpha?: number): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return alpha !== undefined ? `rgba(128,128,128,${alpha})` : "#888";
  if (alpha !== undefined) {
    // Wrap in color-mix for alpha
    return `color-mix(in srgb, ${raw} ${Math.round(alpha * 100)}%, transparent)`;
  }
  return raw;
}
