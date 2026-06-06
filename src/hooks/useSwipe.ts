import { useRef, type PointerEvent as RPE } from "react";

type Opts = {
  onLeft?: () => void;
  onRight?: () => void;
  threshold?: number;
  velocity?: number;
};

export function useSwipe({ onLeft, onRight, threshold = 50, velocity = 0.4 }: Opts) {
  const start = useRef<{ x: number; t: number } | null>(null);

  const onPointerDown = (e: RPE<HTMLElement>) => {
    start.current = { x: e.clientX, t: performance.now() };
  };
  const onPointerUp = (e: RPE<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dt = Math.max(1, performance.now() - s.t);
    const v = Math.abs(dx) / dt;
    if (Math.abs(dx) > threshold || v > velocity) {
      if (dx < 0) onLeft?.();
      else onRight?.();
    }
  };
  return { onPointerDown, onPointerUp };
}
