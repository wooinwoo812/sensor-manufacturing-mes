import { clearSidebarPresentation } from "../lib/sidebar-presentation";
import { clearPendingReads, sharePendingRead } from "./in-flight";
import { discardInitialRequest, takeInitialRequest } from "./initial-request";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = (init.method ?? "GET").toUpperCase();
  const canShare =
    method === "GET" &&
    init.body === undefined &&
    Object.keys(init).every((key) =>
      ["method", "headers", "signal"].includes(key),
    );
  if (canShare) {
    const key = JSON.stringify([
      path,
      [...headers.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ]);
    return sharePendingRead<T>(key, init.signal, (signal) =>
      sendJson<T>(path, { ...init, headers, signal }),
    );
  }
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(method);
  const authMutation = mutation && path.startsWith("/api/auth/");
  if (authMutation) {
    discardInitialRequest();
    clearSidebarPresentation();
  }
  if (mutation) clearPendingReads(authMutation);
  return sendJson<T>(path, { ...init, headers }).finally(() => {
    if (mutation) clearPendingReads(authMutation);
  });
}

async function sendJson<T>(path: string, init: RequestInit): Promise<T> {
  const initial = takeInitialRequest(path, init);
  const abortInitial = () => initial?.controller.abort(init.signal?.reason);
  if (initial) {
    if (init.signal?.aborted) abortInitial();
    init.signal?.addEventListener("abort", abortInitial, { once: true });
  }
  try {
    const response = initial
      ? await initial.response
      : await fetch(path, {
          ...init,
          credentials: "same-origin",
        });
    const body = await readResponseBody(response);
    // Cancellation can happen after headers arrive but before JSON parsing finishes.
    if (init.signal?.aborted) throw init.signal.reason;

    if (!response.ok) {
      if (response.status === 401 || path === "/api/auth/me")
        clearSidebarPresentation();
      const error = asErrorBody(body);
      throw new ApiRequestError(
        response.status,
        error?.code ?? "API_REQUEST_FAILED",
        error?.message ?? `요청을 처리하지 못했습니다. (${response.status})`,
      );
    }

    return body as T;
  } finally {
    init.signal?.removeEventListener("abort", abortInitial);
  }
}

async function readResponseBody(response: Response) {
  if (response.status === 204) {
    return undefined;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function asErrorBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const candidate = body as Record<string, unknown>;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
  };
}
