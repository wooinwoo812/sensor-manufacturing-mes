interface InitialRequest {
  path: string;
  controller: AbortController;
  response: Promise<Response>;
  startedAt: number;
}
declare global {
  interface Window {
    __MES_INITIAL_REQUEST__?: InitialRequest;
  }
}

/** Hand off one fresh document request. This is not a cache of a previous session. */
export function takeInitialRequest(
  path: string,
  init: RequestInit,
): InitialRequest | undefined {
  const request = window.__MES_INITIAL_REQUEST__;
  if (
    !request ||
    request.path !== path ||
    (init.method ?? "GET").toUpperCase() !== "GET"
  )
    return;
  if (
    init.body !== undefined ||
    !Object.keys(init).every((key) =>
      ["method", "headers", "signal"].includes(key),
    )
  )
    return;
  const headers = [...new Headers(init.headers).entries()];
  if (
    headers.length !== 1 ||
    headers[0]?.[0] !== "accept" ||
    headers[0]?.[1] !== "application/json"
  )
    return;
  delete window.__MES_INITIAL_REQUEST__;
  if (
    request.controller.signal.aborted ||
    performance.now() - request.startedAt > 30_000
  ) {
    request.controller.abort();
    return;
  }
  return request;
}

export function discardInitialRequest() {
  const request = window.__MES_INITIAL_REQUEST__;
  delete window.__MES_INITIAL_REQUEST__;
  request?.controller.abort();
}
