import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(path.join(root, file), "utf8");
const catalog = JSON.parse(read("docs/catalog.json"));
function files(directory) {
  return readdirSync(path.join(root, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const name = directory + "/" + entry.name;
    return entry.isDirectory() ? files(name) : [name];
  });
}
test("문서 목록은 docs의 Markdown과 공개 루트 문서를 빠짐없이 한 번씩 포함한다", () => {
  const expected = [
    ...files("docs").filter((file) => file.endsWith(".md")),
    "README.md",
    "PRODUCT.md",
    "CONTRIBUTING.md",
    "THIRD_PARTY_NOTICES.md",
  ];
  assert.deepEqual(catalog.map((doc) => doc.path).sort(), expected.sort());
  assert.equal(new Set(catalog.map((doc) => doc.id)).size, catalog.length);
  const index = read("docs/README.md");
  for (const doc of catalog) {
    for (const field of ["id", "path", "title", "group", "state", "summary"])
      assert.ok(
        typeof doc[field] === "string" && doc[field].trim(),
        `${doc.id}: ${field}`,
      );
    assert.match(doc.id, /^[a-z0-9-]+$/);
    assert.ok(
      ["현재", "설계", "참고", "결정", "양식", "과거", "기록"].includes(
        doc.state,
      ),
      doc.id,
    );
    assert.ok(
      index.includes(
        `](${doc.path.startsWith("docs/") ? doc.path.slice(5) : "../" + doc.path})`,
      ),
      `${doc.path}: 목차 누락`,
    );
  }
});
test("문서 입구와 인수인계의 현재 요약·변경 기록이 구분된다", () => {
  assert.equal(
    catalog.find((doc) => doc.id === "engineering-index")?.path,
    "docs/engineering/README.md",
  );
  assert.equal(
    catalog.find((doc) => doc.id === "handoff-current")?.state,
    "기록",
  );
  const handoff = read(
    "docs/engineering/handoff-design-overhaul-2026-09-05.md",
  );
  assert.match(handoff, /^## 먼저 읽을 요약$/m);
  assert.match(handoff, /^## 다음 작업과 주의사항$/m);
  assert.doesNotMatch(handoff, /^## (?:최신 추가|최신 보정|최종 검증 결과)/m);
  assert.match(handoff, /실제 화면 투어 v2/);
  assert.match(handoff, /역할별 업무 온보딩 v3/);
});

test("API 탐색 문서의 Method·경로가 현재 Controller와 일치한다", () => {
  const actual = [];
  for (const file of files("apps/api/src").filter((file) =>
    file.endsWith(".controller.ts"),
  )) {
    let base;
    for (const match of read(file).matchAll(
      /@(Controller|Get|Post|Put|Patch|Delete|Head|Options)\(\s*(?:["']([^"']*)["'])?\s*\)/g,
    )) {
      if (match[1] === "Controller") base = match[2] ?? "";
      else {
        assert.notEqual(base, undefined, file);
        actual.push(
          match[1].toUpperCase() +
            " /" +
            ["api", base, match[2]].filter(Boolean).join("/"),
        );
      }
    }
  }
  const documented = [
    ...read("docs/engineering/api-reference.md").matchAll(
      /^\|\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\|\s*(\/api\/[^\s|]+)\s*\|/gm,
    ),
  ].map((match) => match[1] + " " + match[2]);
  assert.ok(actual.length > 0);
  assert.equal(new Set(actual).size, actual.length, "중복 Controller 경로");
  assert.deepEqual(documented.sort(), actual.sort());
});
