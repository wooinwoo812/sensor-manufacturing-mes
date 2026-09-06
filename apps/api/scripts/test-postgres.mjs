import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const runner = join(dirname(require.resolve("vitest/package.json")), "vitest.mjs");
const child = spawn(process.execPath, [runner, "run", "test/production-flow.postgres.spec.ts", "test/inspection-review.postgres.spec.ts", "--maxWorkers=1"], {
  stdio: "inherit", env: { ...process.env, MES_POSTGRES_TESTS: "1" },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
