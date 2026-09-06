import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
const source = readFileSync(
  new URL("../apps/web/public/layout-snapshot.js", import.meta.url),
  "utf8",
);
const sample = {
  version: 2,
  href: "/work-orders",
  width: 1440,
  viewportHeight: 1000,
  sidebar: "expanded",
  height: 1400,
  scrollY: 300,
  regions: [{ name: "table", height: 900 }],
};
function boot(value, type = "reload", blocked = false) {
  const handlers = {},
    saved = [],
    selectors = [];
  const window = { scrollTo() {} },
    panel = {
      contains() {
        return false;
      },
      getAttribute() {
        return "table";
      },
      getBoundingClientRect() {
        return { height: 900 };
      },
      textContent: "PRIVATE RECORD",
    };
  const document = {
    documentElement: {
      dataset: { bootSidebar: "expanded" },
      style: { setProperty() {} },
      scrollHeight: 1400,
    },
    querySelector(s) {
      if (s === '[data-startup-ready="true"]') return {};
      if (s === '[data-slot="sidebar-inset"]')
        return {
          getBoundingClientRect() {
            return { x: 256 };
          },
        };
      return null;
    },
    querySelectorAll(s) {
      selectors.push(s);
      return [panel];
    },
  };
  runInNewContext(source, {
    window,
    document,
    location: { pathname: "/work-orders", search: "" },
    innerWidth: 1440,
    innerHeight: 1000,
    scrollY: 300,
    sessionStorage: {
      getItem() {
        if (blocked) throw Error("blocked");
        return JSON.stringify(value);
      },
      setItem(key, data) {
        saved.push({ key, data });
      },
    },
    performance: {
      getEntriesByType() {
        return [{ type }];
      },
    },
    requestAnimationFrame: (fn) => fn(),
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
  });
  return { window, handlers, saved, selectors };
}
test("동일 화면·크기의 새로고침에서만 데이터 영역 높이를 복원한다", () => {
  assert.equal(boot(sample).window.__MES_DATA_LAYOUT__.regions[0].height, 900);
  for (const type of ["navigate", "back_forward"])
    assert.equal(boot(sample, type).window.__MES_DATA_LAYOUT__, null);
});
test("잘못된 경로·폭·높이·메뉴 상태·차단된 저장소를 안전하게 무시한다", () => {
  for (const change of [
    { version: 1 },
    { href: "/dashboard" },
    { width: 390 },
    { viewportHeight: 844 },
    { sidebar: "collapsed" },
    { height: -1 },
    { regions: [] },
    { regions: [{ name: "table", height: -1 }] },
    { regions: [{ name: "<script>", height: 1 }] },
  ])
    assert.equal(
      boot({ ...sample, ...change }).window.__MES_DATA_LAYOUT__,
      null,
    );
  assert.equal(boot(sample, "reload", true).window.__MES_DATA_LAYOUT__, null);
});
test("표시한 데이터 영역만 측정하고 제목·조건·업무 내용은 저장하지 않는다", () => {
  const { handlers, saved, selectors } = boot(null);
  handlers.pagehide();
  assert.deepEqual(selectors, ["[data-loading-region]"]);
  const layout = JSON.parse(saved[0].data);
  assert.deepEqual(layout.regions, [{ name: "table", height: 900 }]);
  assert.ok(!saved[0].data.includes("PRIVATE"));
  assert.equal(boot(layout).window.__MES_DATA_LAYOUT__.regions[0].height, 900);
});
