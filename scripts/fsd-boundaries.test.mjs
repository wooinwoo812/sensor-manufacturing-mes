import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findFsdBoundaryViolations } from "./fsd-boundaries.mjs";

async function fixture(context, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mes-fsd-"));
  context.after(() => rm(root, { force: true, recursive: true }));

  for (const [relativePath, contents] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents);
  }

  return root;
}

test("하위 layer의 public API import는 통과한다", async (context) => {
  const root = await fixture(context, {
    "app/routes/home.tsx": 'import { HomePage } from "@/pages/home";\n',
    "pages/home/ui/HomePage.tsx": 'import { AppShell } from "@/widgets/app-shell";\n',
    "widgets/app-shell/index.ts": 'export const AppShell = "shell";\n',
  });

  assert.deepEqual(await findFsdBoundaryViolations(root), []);
});

test("상위 layer와 다른 slice import를 검출한다", async (context) => {
  const root = await fixture(context, {
    "shared/ui/button.tsx": 'import { WorkOrder } from "@/entities/work-order";\n',
    "pages/home/ui/HomePage.tsx": 'import { AdminPage } from "@/pages/admin";\n',
  });

  const violations = await findFsdBoundaryViolations(root);
  assert.equal(violations.length, 2);
  assert.ok(violations.some(({ reason }) => /상위/u.test(reason)));
  assert.ok(violations.some(({ reason }) => /다른 slice/u.test(reason)));
});

test("slice 내부 deep import를 검출한다", async (context) => {
  const root = await fixture(context, {
    "pages/home/ui/HomePage.tsx":
      'import { AppShell } from "@/widgets/app-shell/ui/AppShell";\n',
  });

  const violations = await findFsdBoundaryViolations(root);
  assert.equal(violations.length, 1);
  assert.match(violations[0]?.reason ?? "", /public API/u);
});

test("실제 Web source가 FSD 경계를 지킨다", async () => {
  const sourceRoot = path.resolve("apps/web/src");
  assert.deepEqual(await findFsdBoundaryViolations(sourceRoot), []);
});
