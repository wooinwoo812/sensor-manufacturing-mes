import { expect, it } from "vitest";
import { auditSummary } from "../src/audit-events/audit-summary.js";

it("fits the database character limit without splitting supplementary Unicode characters", () => {
  expect(auditSummary("가".repeat(200))).toBe("가".repeat(200));
  expect(auditSummary("🔧".repeat(250))).toBe(`${"🔧".repeat(199)}…`);
  expect(Array.from(auditSummary("🔧".repeat(250)))).toHaveLength(200);
});
