import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8")
    .replaceAll("\r\n", "\n")
    .trimEnd();
test("Pretendard의 원본 subset·라이선스·자산을 유지하고 늦은 폰트 교체만 막는다", () => {
  const original = read(
    "apps/web/node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css",
  );
  const actual = read("apps/web/src/app/styles/fonts.css");
  const expected =
    "/* Generated from the installed Pretendard subset CSS. See scripts/font-policy.test.mjs. */\n" +
    original
      .replaceAll("font-display: swap", "font-display: optional")
      .replaceAll(
        "url(./woff2-dynamic-subset/",
        "url(../../../node_modules/pretendard/dist/web/variable/woff2-dynamic-subset/",
      );
  assert.equal(actual, expected);
  for (const match of actual.matchAll(/url\(([^)]+)\)/g))
    assert.ok(
      readFileSync(
        new URL("../apps/web/src/app/styles/" + match[1], import.meta.url),
      ).length > 0,
    );
});
