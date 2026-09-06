import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "./http";
import { clearPendingReads } from "./in-flight";
import { discardInitialRequest, takeInitialRequest } from "./initial-request";

function initial() {
  const controller = new AbortController();
  let resolve!: (response: Response) => void;
  let reject!: (reason: unknown) => void;
  const response = new Promise<Response>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  response.catch(() => {});
  controller.signal.addEventListener(
    "abort",
    () => reject(controller.signal.reason),
    { once: true },
  );
  const request = {
    path: "/api/auth/me",
    controller,
    response,
    startedAt: performance.now(),
  };
  window.__MES_INITIAL_REQUEST__ = request;
  return { ...request, resolve, reject };
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
afterEach(() => {
  discardInitialRequest();
  clearPendingReads(true);
  vi.unstubAllGlobals();
});

describe("single-use document authentication handoff", () => {
  it("shares one initial request and fetches again after it completes", async () => {
    const boot = initial(),
      fetch = vi.fn().mockResolvedValue(json({ fresh: true }));
    vi.stubGlobal("fetch", fetch);
    const a = requestJson("/api/auth/me"),
      b = requestJson("/api/auth/me");
    await Promise.resolve();
    expect(window.__MES_INITIAL_REQUEST__).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    boot.resolve(json({ initial: true }));
    expect(await a).toEqual({ initial: true });
    expect(await b).toEqual({ initial: true });
    expect(await requestJson("/api/auth/me")).toEqual({ fresh: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([401, 503])(
    "preserves HTTP %s and allows a fresh retry",
    async (status) => {
      const boot = initial(),
        fetch = vi.fn().mockResolvedValue(json({ retry: true }));
      vi.stubGlobal("fetch", fetch);
      const read = requestJson("/api/auth/me");
      const failed = expect(read).rejects.toMatchObject({
        status,
        code: "CHECK_FAILED",
      });
      boot.resolve(
        json({ code: "CHECK_FAILED", message: "try again" }, status),
      );
      await failed;
      expect(fetch).not.toHaveBeenCalled();
      expect(await requestJson("/api/auth/me")).toEqual({ retry: true });
    },
  );
  it("preserves network rejection and permits a fresh retry", async () => {
    const boot = initial(),
      failure = new TypeError("offline");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ retry: true })));
    const failed = expect(requestJson("/api/auth/me")).rejects.toBe(failure);
    boot.reject(failure);
    await failed;
    expect(await requestJson("/api/auth/me")).toEqual({ retry: true });
  });
  it("lets one consumer leave without cancelling the other", async () => {
    const boot = initial(),
      first = new AbortController();
    const a = requestJson("/api/auth/me", { signal: first.signal }),
      b = requestJson("/api/auth/me");
    const cancelled = expect(a).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    first.abort();
    await cancelled;
    expect(boot.controller.signal.aborted).toBe(false);
    boot.resolve(json({ ok: true }));
    await b;
  });
  it("aborts the initial transport after its final consumer leaves", async () => {
    const boot = initial(),
      owner = new AbortController();
    const read = requestJson("/api/auth/me", { signal: owner.signal });
    const cancelled = expect(read).rejects.toMatchObject({
      name: "AbortError",
    });
    await Promise.resolve();
    owner.abort();
    await cancelled;
    await Promise.resolve();
    expect(boot.controller.signal.aborted).toBe(true);
  });
  it("discards an unclaimed initial read when authentication changes", async () => {
    const boot = initial();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(json({ ok: true }))),
    );
    await requestJson("/api/auth/logout", { method: "POST" });
    expect(boot.controller.signal.aborted).toBe(true);
    expect(window.__MES_INITIAL_REQUEST__).toBeUndefined();
    await requestJson("/api/auth/me");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not deliver a parsed initial body after an authentication change", async () => {
    const boot = initial();
    let finishBody!: (value: unknown) => void;
    const parse = vi.fn(
      () =>
        new Promise((resolve) => {
          finishBody = resolve;
        }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: true })));
    const failed = expect(requestJson("/api/auth/me")).rejects.toMatchObject({
      name: "AbortError",
    });
    boot.resolve({ ok: true, status: 200, json: parse } as unknown as Response);
    await vi.waitFor(() => expect(parse).toHaveBeenCalledOnce());
    const logout = requestJson("/api/auth/logout", { method: "POST" });
    finishBody({ old: true });
    await failed;
    await logout;
    expect(boot.controller.signal.aborted).toBe(true);
  });
  it.each([
    ["/api/items", {}],
    ["/api/auth/me", { cache: "no-store" }],
    ["/api/auth/me", { headers: { "X-Context": "other" } }],
  ] as [string, RequestInit][])(
    "does not consume a handoff for non-equivalent %s %j",
    async (path, init) => {
      const boot = initial();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: true })));
      await requestJson(path, init);
      expect(fetch).toHaveBeenCalledOnce();
      expect(window.__MES_INITIAL_REQUEST__?.response).toBe(boot.response);
    },
  );
  it.each(["old", "aborted"])(
    "discards an %s handoff and requests current authentication",
    async (state) => {
      const boot = initial();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(json({ current: true })),
      );
      if (state === "old")
        window.__MES_INITIAL_REQUEST__!.startedAt = performance.now() - 30_001;
      else boot.controller.abort();
      expect(await requestJson("/api/auth/me")).toEqual({ current: true });
      expect(fetch).toHaveBeenCalledOnce();
      expect(boot.controller.signal.aborted).toBe(true);
      expect(window.__MES_INITIAL_REQUEST__).toBeUndefined();
    },
  );
  it("does not consume a handoff for custom methods or bodies", () => {
    const boot = initial();
    for (const init of [{ method: "HEAD" }, { method: "POST" }, { body: "{}" }])
      expect(
        takeInitialRequest("/api/auth/me", {
          headers: { Accept: "application/json" },
          ...init,
        }),
      ).toBeUndefined();
    expect(window.__MES_INITIAL_REQUEST__?.response).toBe(boot.response);
  });
});
