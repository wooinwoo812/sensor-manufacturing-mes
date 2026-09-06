import { describe, expect, it } from "vitest";
import {
  hasPermissions,
  Permission,
  ROLE_CONFIG,
} from "../src/auth/auth.contract.js";
const unchanged = {
  PRODUCTION_PLANNER: [
    "dashboard:read",
    "work-order:read",
    "work-order:create",
    "work-order:release",
    "work-order:cancel",
    "master-data:read",
    "material-lot:read",
    "material-allocation:read",
    "process-execution:read",
    "inspection:read",
    "quality-incident:read",
    "trace:read",
  ],
  MATERIAL_MANAGER: [
    "work-order:read",
    "master-data:read",
    "material-lot:read",
    "material-allocation:read",
    "material-allocation:create",
    "material-allocation:release",
    "quality-incident:read",
    "trace:read",
  ],
  SHOP_FLOOR_OPERATOR: [
    "work-order:read",
    "process-execution:read",
    "process-execution:execute",
  ],
  QUALITY_ENGINEER: [
    "work-order:read",
    "master-data:read",
    "material-lot:read",
    "material-lot:decide-quality",
    "process-execution:read",
    "inspection:read",
    "inspection:execute",
    "inspection:correct",
    "production-lot:decide-quality",
    "quality-incident:read",
    "quality-incident:create",
    "quarantine-target:decide",
    "trace:read",
  ],
} as const;
describe("explicit highest administrator policy", () => {
  it.each(Object.keys(unchanged) as (keyof typeof unchanged)[])(
    "keeps %s permissions unchanged",
    (role) => {
      expect(new Set(ROLE_CONFIG[role].permissions)).toEqual(
        new Set(unchanged[role]),
      );
    },
  );
  it("grants every declared capability exactly once through the ordinary matrix", () => {
    expect([...ROLE_CONFIG.SYSTEM_ADMIN.permissions].sort()).toEqual(
      Object.values(Permission).sort(),
    );
    for (const permission of Object.values(Permission))
      expect(hasPermissions("SYSTEM_ADMIN", [permission])).toBe(true);
    expect(
      hasPermissions("SYSTEM_ADMIN", ["not-a-permission" as Permission]),
    ).toBe(false);
  });
});
