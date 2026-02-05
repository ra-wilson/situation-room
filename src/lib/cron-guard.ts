type GuardState = {
  inFlight: Map<string, number>;
};

type GuardResult<T> =
  | { skipped: true }
  | { skipped: false; result: T };

const getState = (): GuardState => {
  const globalForGuard = globalThis as typeof globalThis & {
    __cronGuard?: GuardState;
  };

  if (!globalForGuard.__cronGuard) {
    globalForGuard.__cronGuard = { inFlight: new Map() };
  }

  return globalForGuard.__cronGuard;
};

export const runWithCronGuard = async <T>(
  key: string,
  ttlMs: number,
  runner: () => Promise<T>,
): Promise<GuardResult<T>> => {
  const state = getState();
  const now = Date.now();
  const startedAt = state.inFlight.get(key);

  if (startedAt && now - startedAt < ttlMs) {
    return { skipped: true };
  }

  state.inFlight.set(key, now);

  try {
    const result = await runner();
    return { skipped: false, result };
  } finally {
    state.inFlight.delete(key);
  }
};
