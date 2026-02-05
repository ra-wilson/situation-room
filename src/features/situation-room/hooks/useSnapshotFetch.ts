import { useCallback, useRef, useState } from 'react';

type SnapshotState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

export function useSnapshotFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean } = {}
) {
  const [state, setState] = useState<SnapshotState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const enabled = options.enabled ?? true;

  const fetchSnapshot = useCallback(async () => {
    if (!enabled) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const snapshot = await fetcher(controller.signal);
      setState({ data: snapshot, isLoading: false, error: null });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, isLoading: false, error: message });
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, fetcher]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
  }, []);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    fetchSnapshot,
    cancel,
  };
}
