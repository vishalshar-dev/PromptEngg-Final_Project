import { useEffect, useRef, useState } from 'react';

export function useAnimatedNumber(
  target: number,
  reducedMotion: boolean,
  durationMs = 320
): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const currentRef = useRef<number>(safeTarget);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    if (reducedMotion || Math.abs(safeTarget - currentRef.current) < 0.01) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const startValue = currentRef.current;
    const delta = safeTarget - startValue;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / Math.max(80, durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startValue + delta * eased;
      currentRef.current = next;
      setDisplayValue(next);

      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        currentRef.current = safeTarget;
        setDisplayValue(safeTarget);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [safeTarget, reducedMotion, durationMs]);

  return displayValue;
}
