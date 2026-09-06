import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
const source = readFileSync(
  new URL("../apps/web/public/boot.js", import.meta.url),
  "utf8",
);
function boot(cookie, osDark = false, path = "/work-orders") {
  const classes = new Set(),
    root = {
      classList: {
        toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
      },
      dataset: {},
      style: {},
    };
  const document = {
    documentElement: root,
    querySelectorAll: (selector) => {
      assert.equal(
        selector,
        ".mes-boot [data-boot-page-title]",
        "never select the root title preference attribute",
      );
      return [{ textContent: "" }, { textContent: "" }];
    },
    get cookie() {
      if (cookie === null) throw new Error("blocked");
      return cookie;
    },
  };
  runInNewContext(source, {
    document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    matchMedia: () => ({ matches: osDark }),
    location: { pathname: path },
  });
  return { root, classes };
}
test("저장한 테마·메뉴 폭을 OS 설정보다 먼저 적용한다", () => {
  const { root, classes } = boot("vite-ui-theme=dark; sidebar_state=false");
  assert.equal(root.style.colorScheme, "dark");
  assert.ok(classes.has("dark"));
  assert.equal(root.dataset.bootSidebar, "collapsed");
  assert.equal(root.dataset.bootLayout, "shell");
  assert.ok(boot("vite-ui-theme=light", true).classes.has("light"));
});
test("시스템·잘못된 값·차단된 쿠키도 안전한 기본 표시를 사용한다", () => {
  for (const cookie of ["vite-ui-theme=system", "vite-ui-theme=unknown", null])
    assert.ok(boot(cookie, true).classes.has("dark"));
  assert.equal(boot("").root.dataset.bootSidebar, "expanded");
  assert.equal(boot("", false, "/login").root.dataset.bootLayout, "public");
});
test("초기 스크립트를 앱 스타일·모듈보다 먼저 읽고 준비 화면에 공통 배치를 사용한다", () => {
  const html = readFileSync(
    new URL("../apps/web/index.html", import.meta.url),
    "utf8",
  );
  assert.ok(html.indexOf("/boot.js") < html.indexOf("/session-bootstrap.js"));
  assert.ok(html.indexOf("/session-bootstrap.js") < html.indexOf("/boot.css"));
  assert.ok(html.indexOf("/boot.js") < html.indexOf("/boot.css"));
  assert.ok(html.indexOf("/boot.css") < html.indexOf("/src/main.tsx"));
  for (const marker of [
    "boot-sidebar",
    "boot-header",
    "boot-workspace",
    "boot-main",
  ])
    assert.ok(html.includes(marker));
});

test("초기 HTML과 React 로딩 화면에 사이드바 스켈레톤을 만들지 않는다", () => {
  for (const file of [
    "apps/web/index.html",
    "apps/web/src/app/entrypoint/InitialLoading.tsx",
  ]) {
    const content = readFileSync(
      new URL("../" + file, import.meta.url),
      "utf8",
    );
    assert.ok(!content.includes("boot-navigation"));
    assert.ok(!content.includes("화면과 접속 상태를 확인"));
    assert.ok(content.includes("boot-status"));
    assert.ok(content.includes("data-boot-page-title"));
    const sidebar = content.slice(
      content.indexOf('="boot-sidebar"'),
      content.indexOf('="boot-workspace"'),
    );
    assert.ok(!sidebar.includes("boot-line"));
  }
});

test("초기 제목은 앱의 공개 경로 제목과 일치하고 URL의 레코드 식별자를 노출하지 않는다", () => {
  const shell = readFileSync(
    new URL("../apps/web/src/app/shell-config.ts", import.meta.url),
    "utf8",
  );
  const literal = shell.match(
    /const routeTitles:[\s\S]*?= (\{[\s\S]*?\n\});/,
  )?.[1];
  assert.ok(literal);
  const titles = runInNewContext("(" + literal + ")");
  for (const [path, { title }] of Object.entries(titles)) {
    assert.equal(boot("", false, path).root.dataset.bootPageTitle, title);
    assert.equal(
      boot("", false, path + "/private-record-id").root.dataset.bootPageTitle,
      title,
    );
  }
  for (const path of ["/", "/login", "/unknown-private-record-id"])
    assert.equal(boot("", false, path).root.dataset.bootPageTitle, "");
});

test("HTML 제목이 하나씩 파싱되어도 관찰자가 자기 변경을 무한 반복하지 않는다", () => {
  let notify,
    observed = false,
    disconnected = false,
    changes = 0;
  const titles = [];
  const root = { dataset: {}, style: {}, classList: { toggle() {} } };
  const document = {
    documentElement: root,
    cookie: "",
    querySelectorAll: () => titles,
  };
  runInNewContext(source, {
    document,
    matchMedia: () => ({ matches: false }),
    location: { pathname: "/work-orders" },
    MutationObserver: class {
      constructor(callback) {
        notify = callback;
      }
      observe() {
        observed = true;
      }
      disconnect() {
        disconnected = true;
      }
    },
  });
  assert.equal(observed, true);
  const title = () => {
    let text = "";
    return {
      get textContent() {
        return text;
      },
      set textContent(value) {
        text = value;
        changes++;
      },
    };
  };
  titles.push(title());
  notify();
  assert.equal(changes, 1);
  assert.equal(disconnected, false);
  notify();
  assert.equal(changes, 1, "same text must not enqueue another mutation");
  titles.push(title());
  notify();
  assert.equal(changes, 2);
  assert.equal(disconnected, true);
  assert.equal(titles[0].textContent, "작업지시");
  assert.equal(titles[1].textContent, "작업지시");
});
