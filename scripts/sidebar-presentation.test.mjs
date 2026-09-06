import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { JSDOM } = require("jsdom");
const source = readFileSync(
  new URL("../apps/web/public/sidebar-presentation.js", import.meta.url),
  "utf8",
);
const auth = readFileSync(
  new URL("../apps/api/src/auth/auth.contract.ts", import.meta.url),
  "utf8",
);
const shell = readFileSync(
  new URL("../apps/web/src/app/shell-config.ts", import.meta.url),
  "utf8",
);
const Permission = runInNewContext(
  "(" +
    auth.match(/export const Permission = (\{[\s\S]*?\n\}) as const/)[1] +
    ")",
);
const RoleCode = Object.fromEntries(
  [...auth.matchAll(/\[RoleCode\.(\w+)\]/g)].map((match) => [
    match[1],
    match[1],
  ]),
);
const roles = runInNewContext(
  "(" +
    auth.match(/export const ROLE_CONFIG:[\s\S]*?= (\{[\s\S]*?\n\});/)[1] +
    ")",
  {
    RoleCode,
    Permission,
    workOrderRead: [Permission.WORK_ORDER_READ],
    materialReads: [Permission.MASTER_DATA_READ, Permission.MATERIAL_LOT_READ],
  },
);
const groups = runInNewContext(
  "(" + shell.match(/const navigation:[\s\S]*?= (\[[\s\S]*?\n\]);/)[1] + ")",
);
const key = "mes:sidebar-presentation:v1";
function setup({
  role = "PRODUCTION_PLANNER",
  type = "reload",
  path = "/work-orders",
  raw,
  blocked = false,
} = {}) {
  const dom = new JSDOM(
    '<html data-boot-layout="' +
      (path === "/login" ? "public" : "shell") +
      '"><body><div class="mes-boot"><div class="boot-sidebar"></div></div></body></html>',
    { url: "http://localhost:5173" + path, runScripts: "outside-only" },
  );
  const values = new Map([
    [
      key,
      raw ??
        JSON.stringify({ version: 1, role, expiresAt: Date.now() + 60_000 }),
    ],
  ]);
  Object.defineProperty(dom.window, "sessionStorage", {
    value: {
      getItem: (k) => {
        if (blocked) throw Error("blocked");
        return values.get(k);
      },
      setItem: (k, v) => {
        if (blocked) throw Error("blocked");
        values.set(k, v);
      },
      removeItem: (k) => {
        if (blocked) throw Error("blocked");
        values.delete(k);
      },
    },
  });
  dom.window.performance.getEntriesByType = () => [{ type }];
  dom.window.eval(source);
  return {
    dom,
    values,
    document: dom.window.document,
    api: dom.window.__MES_SIDEBAR_PREVIEW__,
  };
}
test("다섯 역할의 공개 메뉴 표시는 서버 권한과 실제 셸 메뉴에 일치한다", () => {
  for (const [code, role] of Object.entries(roles)) {
    const { dom, document } = setup({ role: code });
    const expected = groups
      .flatMap((group) => group.items)
      .filter((item) => role.permissions.includes(item.permission))
      .map((item) => item.to)
      .concat("/guide");
    assert.deepEqual(
      [...document.querySelectorAll("[data-preview-path]")].map(
        (node) => node.dataset.previewPath,
      ),
      Array.from(expected),
    );
    assert.equal(
      document.querySelector(".preview-role").textContent,
      role.label,
    );
    assert.equal(
      document.querySelector(".boot-sidebar").getAttribute("aria-hidden"),
      "true",
    );
    assert.ok(document.querySelector(".boot-sidebar").hasAttribute("inert"));
    assert.equal(
      document.querySelectorAll("a,button,input,[tabindex]").length,
      0,
    );
    dom.window.close();
  }
});
test("첫 방문·공개 화면·불명확한 표시 힌트는 업무 메뉴를 복원하지 않는다", () => {
  for (const options of [
    { type: "navigate" },
    { path: "/login" },
    { role: "__proto__" },
    { role: "<script>" },
    { raw: "invalid" },
    { raw: JSON.stringify({ version: 1, role: "SYSTEM_ADMIN", expiresAt: 0 }) },
    {
      raw: JSON.stringify({
        version: 1,
        role: "SYSTEM_ADMIN",
        expiresAt: Date.now() + 3600000,
      }),
    },
    { blocked: true },
  ]) {
    const { dom, document } = setup(options);
    assert.equal(document.querySelectorAll("[data-preview-path]").length, 0);
    dom.window.close();
  }
});
test("표시 힌트에는 공개 역할 이름과 유효시간만 남기고 로그아웃 경계에서 삭제한다", () => {
  const { dom, values, api } = setup();
  api.remember("SYSTEM_ADMIN");
  assert.deepEqual(Object.keys(JSON.parse(values.get(key))).sort(), [
    "expiresAt",
    "role",
    "version",
  ]);
  assert.equal(JSON.parse(values.get(key)).role, "SYSTEM_ADMIN");
  api.clear();
  assert.equal(values.has(key), false);
  assert.equal(dom.window.document.querySelectorAll("[data-preview-path]").length, 0);
  dom.window.close();
});
test("로그인 이후 같은 문서에서 확인한 역할도 새 초기 화면에 표시할 수 있다", () => {
  const {dom,document,api} = setup({path:"/login"});
  dom.window.history.pushState({}, "", "/work-orders");
  api.remember("PRODUCTION_PLANNER");
  const target=document.createElement("div");
  api.paint(target);
  assert.equal(target.querySelectorAll("[data-preview-path]").length,9);
  dom.window.close();
});
test("React 초기 로딩으로 전환해도 같은 공개 메뉴를 다시 표시한다", () => {
  const { dom, document, api } = setup({ path: "/execution/lots/sample" });
  const target = document.createElement("div");
  api.paint(target);
  assert.equal(target.querySelectorAll("[data-preview-path]").length, 9);
  assert.equal(
    target.querySelector("[data-active=true]").dataset.previewPath,
    "/execution/queue",
  );
  dom.window.close();
});
