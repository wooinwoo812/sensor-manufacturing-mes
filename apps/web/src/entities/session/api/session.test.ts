import { afterEach, expect, it, vi } from "vitest";
import { fetchCurrentSession } from "./session";

afterEach(() => {
  delete window.__MES_INITIAL_REQUEST__;
  delete window.__MES_SIDEBAR_PREVIEW__;
  vi.unstubAllGlobals();
});
it("validates the initial document response instead of treating it as a trusted cached session", async () => {
  const clear = vi.fn();
  window.__MES_SIDEBAR_PREVIEW__ = {clear,paint:vi.fn(),remember:vi.fn()};
  vi.stubGlobal("fetch", vi.fn());
  window.__MES_INITIAL_REQUEST__ = {
    path: "/api/auth/me",
    controller: new AbortController(),
    startedAt: performance.now(),
    response: Promise.resolve(
      new Response(JSON.stringify({ user: { id: "invalid" } })),
    ),
  };
  await expect(fetchCurrentSession()).rejects.toMatchObject({ status: 502 });
  expect(fetch).not.toHaveBeenCalled();
  expect(clear).toHaveBeenCalled();
});
