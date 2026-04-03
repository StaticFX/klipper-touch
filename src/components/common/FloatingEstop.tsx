import { useRef, useState, useCallback, useEffect } from "react";
import { OctagonX } from "lucide-react";
import { emergencyStop } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";

const STORAGE_KEY = "klipper-touch-estop-position";
const BUTTON_SIZE = 56;

function loadPosition(): { x: number; y: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function savePosition(x: number, y: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function FloatingEstop() {
  const showConfirm = useUiStore((s) => s.showConfirm);
  const estopConfirm = useUiStore((s) => s.estopConfirm);
  const ref = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const saved = loadPosition();
  const [pos, setPos] = useState({
    x: saved?.x ?? (typeof window !== "undefined" ? window.innerWidth - BUTTON_SIZE - 16 : 300),
    y: saved?.y ?? (typeof window !== "undefined" ? window.innerHeight - BUTTON_SIZE - 80 : 300),
  });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    const nx = clamp(e.clientX - offset.current.x, 0, window.innerWidth - BUTTON_SIZE);
    const ny = clamp(e.clientY - offset.current.y, 0, window.innerHeight - BUTTON_SIZE);
    setPos({ x: nx, y: ny });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      setPos((p) => {
        savePosition(p.x, p.y);
        return p;
      });
    }
  }, []);

  const handleClick = useCallback(() => {
    if (hasMoved.current) return;
    if (estopConfirm) {
      showConfirm({
        title: "Emergency Stop",
        message: "This will immediately halt the printer. Continue?",
        onConfirm: () => emergencyStop(),
      });
    } else {
      emergencyStop();
    }
  }, [estopConfirm, showConfirm]);

  // Keep position in bounds on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        const nx = clamp(p.x, 0, window.innerWidth - BUTTON_SIZE);
        const ny = clamp(p.y, 0, window.innerHeight - BUTTON_SIZE);
        if (nx !== p.x || ny !== p.y) {
          savePosition(nx, ny);
          return { x: nx, y: ny };
        }
        return p;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <button
      ref={ref}
      className="fixed z-40 flex items-center justify-center rounded-full bg-destructive text-white shadow-lg shadow-destructive/30 active:scale-95 transition-transform touch-none select-none"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        left: pos.x,
        top: pos.y,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <OctagonX size={28} />
    </button>
  );
}
