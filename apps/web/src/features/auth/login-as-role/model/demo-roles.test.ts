import { expect, it } from "vitest";
import { DEMO_ROLE_OPTIONS } from "./demo-roles";
it("offers highest administrator first without introducing a sixth account or role", () => {
  expect(DEMO_ROLE_OPTIONS).toHaveLength(5);
  expect(new Set(DEMO_ROLE_OPTIONS.map((role) => role.code)).size).toBe(5);
  expect(DEMO_ROLE_OPTIONS[0]).toMatchObject({
    code: "SYSTEM_ADMIN",
    label: "최고관리자",
    landingLabel: "대시보드",
    email: "admin.demo@sensor-mes.local",
  });
});
