import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findBrokenInternalLinks } from "./internal-links.mjs";

test("존재하는 상대 링크는 통과한다", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mes-doc-links-"));
  context.after(() => rm(root, { force: true, recursive: true }));

  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "README.md"), "[문서](docs/guide.md)\n");
  await writeFile(path.join(root, "docs", "guide.md"), "# Guide\n");

  assert.deepEqual(await findBrokenInternalLinks(root), []);
});

test("깨진 상대 링크를 파일과 함께 반환한다", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mes-doc-links-"));
  context.after(() => rm(root, { force: true, recursive: true }));

  await writeFile(path.join(root, "README.md"), "[누락](docs/missing.md)\n");

  assert.deepEqual(await findBrokenInternalLinks(root), [
    { file: "README.md", destination: "docs/missing.md" },
  ]);
});
