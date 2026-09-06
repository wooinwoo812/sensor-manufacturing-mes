/* global window, document, fetch, AbortController, performance */
// Start this document's real authentication GET alongside JS/CSS loading.
// Single-use in-memory handoff only; no session, permission, or response persistence.
(() => {
  if (document.documentElement.dataset.bootLayout !== "shell") return;
  const controller = new AbortController();
  const response = fetch("/api/auth/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: controller.signal,
  });
  // The app consumes the rejection too; do not emit an unhandled rejection before it starts.
  response.catch(() => {});
  window.__MES_INITIAL_REQUEST__ = {
    path: "/api/auth/me",
    controller,
    response,
    startedAt: performance.now(),
  };
})();
