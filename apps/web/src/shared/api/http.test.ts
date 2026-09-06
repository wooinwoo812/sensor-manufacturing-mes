import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, requestJson } from "./http";
import { clearPendingReads } from "./in-flight";

function transport() {
  const calls: { init: RequestInit; resolve: (response: Response) => void }[] =
    [];
  const fetchMock = vi.fn(
    (_path: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
        calls.push({ init, resolve });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    fetchMock,
    finish(index = 0, value: unknown = { ok: true }, status = 200) {
      calls[index]!.resolve(new Response(JSON.stringify(value), { status }));
    },
  };
}
afterEach(() => {
  clearPendingReads(true);
  vi.unstubAllGlobals();
});

describe("requestJson pending GET ownership", () => {
  it("does not deliver an old body if authentication changed during parsing", async () => {
    const t = transport();
    let finishBody!: (value: unknown) => void;
    const json = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          finishBody = resolve;
        }),
    );
    const old = requestJson("/api/items");
    const cancelled = expect(old).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    t.calls[0]!.resolve({ ok: true, status: 200, json } as unknown as Response);
    await vi.waitFor(() => expect(json).toHaveBeenCalledTimes(1));
    const logout = requestJson("/api/auth/logout", { method: "POST" });
    finishBody({ old: true });
    await cancelled;
    t.finish(1);
    await logout;
  });
  it("shares identical pending reads but never caches completed data", async () => {
    const t = transport();
    const a = requestJson("/api/items"),
      b = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(1);
    expect(t.calls[0]!.init.credentials).toBe("same-origin");
    expect(new Headers(t.calls[0]!.init.headers).get("Accept")).toBe(
      "application/json",
    );
    t.finish();
    expect(await a).toEqual(await b);
    const fresh = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(2);
    t.finish(1);
    await fresh;
  });
  it("transfers a StrictMode cleanup/setup to the same request", async () => {
    const t = transport(),
      first = new AbortController(),
      next = new AbortController();
    const a = requestJson("/api/items", { signal: first.signal });
    const cancelled = expect(a).rejects.toMatchObject({ name: "AbortError" });
    first.abort();
    const b = requestJson("/api/items", { signal: next.signal });
    await Promise.resolve();
    await cancelled;
    expect(t.fetchMock).toHaveBeenCalledTimes(1);
    expect(t.calls[0]!.init.signal!.aborted).toBe(false);
    t.finish();
    await b;
  });
  it("one consumer cancellation does not cancel another", async () => {
    const t = transport(),
      owner = new AbortController();
    const a = requestJson("/api/items", { signal: owner.signal }),
      b = requestJson("/api/items");
    await Promise.resolve();
    const cancelled = expect(a).rejects.toMatchObject({ name: "AbortError" });
    owner.abort();
    await cancelled;
    await Promise.resolve();
    expect(t.calls[0]!.init.signal!.aborted).toBe(false);
    t.finish();
    await b;
  });
  it("aborts when the last consumer leaves and permits a fresh request", async () => {
    const t = transport(),
      owner = new AbortController();
    const a = requestJson("/api/items", { signal: owner.signal });
    await Promise.resolve();
    const cancelled = expect(a).rejects.toMatchObject({ name: "AbortError" });
    owner.abort();
    await cancelled;
    await Promise.resolve();
    expect(t.calls[0]!.init.signal!.aborted).toBe(true);
    const b = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(2);
    t.finish(1);
    await b;
  });
  it("does not send an already cancelled consumer", async () => {
    const t = transport(),
      owner = new AbortController();
    owner.abort();
    await expect(
      requestJson("/api/items", { signal: owner.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(t.fetchMock).not.toHaveBeenCalled();
  });
  it("separates URL, headers and custom transport options", async () => {
    const t = transport();
    const reads = [
      requestJson("/api/items?pageSize=10"),
      requestJson("/api/items?pageSize=20"),
      requestJson("/api/items?pageSize=10", {
        headers: { "X-Context": "different" },
      }),
      requestJson("/api/items?pageSize=10", { cache: "no-store" }),
    ];
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(4);
    t.calls.forEach((_, i) => t.finish(i));
    await Promise.all(reads);
  });
  it("normalizes header order and casing when identifying equivalent reads", async () => {
    const t = transport();
    const a = requestJson("/api/items", {
      headers: { "X-One": "1", "X-Two": "2" },
    });
    const b = requestJson("/api/items", {
      method: "GET",
      headers: { "x-two": "2", "x-one": "1" },
    });
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(1);
    t.finish();
    await Promise.all([a, b]);
  });
  it("shares an error only while pending and allows explicit retry", async () => {
    const t = transport();
    const a = requestJson("/api/items"),
      b = requestJson("/api/items");
    const rejected = Promise.all([
      expect(a).rejects.toBeInstanceOf(ApiRequestError),
      expect(b).rejects.toMatchObject({ status: 503, code: "TEMPORARY" }),
    ]);
    await Promise.resolve();
    t.finish(0, { code: "TEMPORARY", message: "try again" }, 503);
    await rejected;
    const retry = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(2);
    t.finish(1);
    await retry;
  });
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "never merges or retries %s",
    async (method) => {
      const t = transport();
      const a = requestJson("/api/items", { method, body: "{}" }),
        b = requestJson("/api/items", { method, body: "{}" });
      expect(t.fetchMock).toHaveBeenCalledTimes(2);
      expect(new Headers(t.calls[0]!.init.headers).get("Content-Type")).toBe(
        "application/json",
      );
      const rejected = expect(a).rejects.toMatchObject({ status: 409 });
      t.finish(0, {}, 409);
      t.finish(1);
      await rejected;
      await b;
      expect(t.fetchMock).toHaveBeenCalledTimes(2);
    },
  );
  it("isolates reads started before, during and after a mutation", async () => {
    const t = transport();
    const old = requestJson("/api/items");
    await Promise.resolve();
    const command = requestJson("/api/items", { method: "POST" });
    const during = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(3);
    t.finish(1);
    await command;
    const after = requestJson("/api/items");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(4);
    for (const i of [0, 2, 3]) t.finish(i);
    await Promise.all([old, during, after]);
  });
  it("authentication changes abort even reads detached by an earlier mutation", async () => {
    const t = transport();
    const old = requestJson("/api/items");
    const rejectedOld = expect(old).rejects.toMatchObject({
      name: "AbortError",
    });
    await Promise.resolve();
    const mutation = requestJson("/api/items", { method: "POST" });
    t.finish(1);
    await mutation;
    const me = requestJson("/api/auth/me");
    const rejectedMe = expect(me).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    const logout = requestJson("/api/auth/logout", { method: "POST" });
    await Promise.all([rejectedOld, rejectedMe]);
    t.finish(3);
    await logout;
    const newSession = requestJson("/api/auth/me");
    await Promise.resolve();
    expect(t.fetchMock).toHaveBeenCalledTimes(5);
    t.finish(4);
    await newSession;
  });
});
