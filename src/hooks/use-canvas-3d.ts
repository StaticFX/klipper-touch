import { useRef, useEffect, useCallback } from "react";

interface UseCanvas3DOptions {
  draw: (rotation: number, elevation: number) => void;
  defaultRotation?: number;
  defaultElevation?: number;
  minElevation?: number;
  maxElevation?: number;
  sensitivity?: number;
}

export function useCanvas3D({
  draw,
  defaultRotation = Math.PI * 0.22,
  defaultElevation = Math.PI * 0.16,
  minElevation = 0.05,
  maxElevation = Math.PI * 0.45,
  sensitivity = 0.008,
}: UseCanvas3DOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(defaultRotation);
  const elevRef = useRef(defaultElevation);
  const rafRef = useRef(0);

  const redraw = useCallback(() => {
    draw(rotRef.current, elevRef.current);
  }, [draw]);

  // Resize observer + initial draw
  useEffect(() => {
    redraw();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Touch / mouse rotation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function scheduleRedraw() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => redraw());
    }

    function onMove(dx: number, dy: number) {
      rotRef.current += dx * sensitivity;
      elevRef.current = Math.max(minElevation, Math.min(maxElevation, elevRef.current - dy * sensitivity));
      scheduleRedraw();
    }

    function onMouseDown(e: MouseEvent) { dragging = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault(); }
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      onMove(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
    }
    function onMouseUp() { dragging = false; }

    let startX = 0;
    let startY = 0;
    let touchLocked = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lastX = startX;
      lastY = startY;
      dragging = false;
      touchLocked = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const tx = e.touches[0].clientX, ty = e.touches[0].clientY;
      const dx = tx - startX, dy = ty - startY;

      if (!touchLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        touchLocked = true;
        dragging = Math.abs(dx) >= Math.abs(dy);
      }

      if (dragging) {
        e.preventDefault();
        onMove(tx - lastX, ty - lastY);
      }
      lastX = tx; lastY = ty;
    }
    function onTouchEnd() { dragging = false; touchLocked = false; }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, [redraw, sensitivity, minElevation, maxElevation]);

  const resetView = useCallback(() => {
    rotRef.current = defaultRotation;
    elevRef.current = defaultElevation;
    redraw();
  }, [defaultRotation, defaultElevation, redraw]);

  return { canvasRef, containerRef, rotRef, elevRef, resetView };
}
