import { useEffect, useRef, useState } from 'react';

const WINDOW_MS = 2000;
const MAX_RENDERS = 20;

export function useRenderGuard(componentName: string) {
  const [tripped, setTripped] = useState(false);
  const windowStartRef = useRef<number | null>(null);
  const renderCountRef = useRef(0);
  const warnedRef = useRef(false);

  useEffect(() => {
    if (tripped) return;
    const now = Date.now();
    if (windowStartRef.current === null || now - windowStartRef.current > WINDOW_MS) {
      windowStartRef.current = now;
      renderCountRef.current = 0;
    }
    renderCountRef.current += 1;
    if (renderCountRef.current > MAX_RENDERS && !warnedRef.current) {
      warnedRef.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[RenderGuard] ${componentName} rendered more than ${MAX_RENDERS} times in ${WINDOW_MS}ms. ` +
          'Halting fetches to prevent runaway rendering.'
      );
      setTripped(true);
    }
  });

  return { tripped };
}
