import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
const source = readFileSync(
  new URL("../apps/web/public/session-bootstrap.js", import.meta.url),
  "utf8",
);
function boot(layout, fetch) {
  const window = {};
  runInNewContext(source, {
    window,
    document: { documentElement: { dataset: { bootLayout: layout } } },
    fetch,
    AbortController,
    performance: { now: () => 12 },
  });
  return window;
}
test("보호된 문서만 실제 인증 GET 하나를 미리 시작하고 원래 Promise를 인계한다", async () => {
  let calls = 0;
  const response = Promise.resolve(new Response("{}"));
  const window = boot("shell", (path, init) => {
    calls++;
    assert.equal(path, "/api/auth/me");
    assert.equal(init.method, "GET");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.cache, "no-store");
    assert.equal(init.headers.Accept, "application/json");
    assert.equal(init.signal.aborted, false);
    return response;
  });
  assert.equal(calls, 1);
  assert.equal(window.__MES_INITIAL_REQUEST__.response, response);
  assert.equal(window.__MES_INITIAL_REQUEST__.startedAt, 12);
  await response;
});
test("공개·로그인 화면은 인증 선행 요청을 만들지 않는다", () => {
  for (const layout of ["public", undefined]) {
    const window = boot(layout, () => assert.fail("must not fetch"));
    assert.equal(window.__MES_INITIAL_REQUEST__, undefined);
  }
});
test("앱 시작 전 통신 실패도 전역 미처리 오류 없이 원래 소비자에게 전달한다", async () => {
  const failure = new TypeError("offline");
  const window = boot("shell", () => Promise.reject(failure));
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    window.__MES_INITIAL_REQUEST__.response,
    (error) => error === failure,
  );
});
