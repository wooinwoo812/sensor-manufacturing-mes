interface PendingRead {
  controller: AbortController;
  promise: Promise<unknown>;
  consumers: Set<symbol>;
  settled: boolean;
}

// Pending requests only: never retain fulfilled data, permissions, or errors.
const pendingReads = new Map<string, PendingRead>();
// Include reads detached from the sharing index by a business mutation.
const activeReads = new Set<PendingRead>();

export function clearPendingReads(abort = false) {
  if (abort) for (const entry of activeReads) entry.controller.abort();
  pendingReads.clear();
}

export function sharePendingRead<T>(
  key: string,
  signal: AbortSignal | null | undefined,
  load: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  let entry = pendingReads.get(key);
  if (!entry || entry.controller.signal.aborted) {
    const controller = new AbortController();
    const created: PendingRead = {
      controller,
      consumers: new Set(),
      settled: false,
      promise: Promise.resolve()
        .then(() => {
          if (controller.signal.aborted) throw controller.signal.reason;
          return load(controller.signal);
        })
        .finally(() => {
          created.settled = true;
          activeReads.delete(created);
          if (pendingReads.get(key) === created) pendingReads.delete(key);
        }),
    };
    activeReads.add(created);
    pendingReads.set(key, created);
    entry = created;
  }
  const shared = entry;
  const consumer = Symbol();
  shared.consumers.add(consumer);
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const release = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", onAbort);
      shared.consumers.delete(consumer);
      // StrictMode cleanup/setup can transfer ownership within the same turn.
      queueMicrotask(() => {
        if (!shared.settled && shared.consumers.size === 0) {
          shared.controller.abort();
          if (pendingReads.get(key) === shared) pendingReads.delete(key);
        }
      });
    };
    const onAbort = () => {
      release();
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    shared.promise.then(
      (value) => {
        release();
        resolve(value as T);
      },
      (error: unknown) => {
        release();
        reject(error);
      },
    );
  });
}
