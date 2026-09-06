import { ROLE_GUIDES, guideStorageKey } from "./role-onboarding";

it.each([
  ["PRODUCTION_PLANNER", 24],
  ["SHOP_FLOOR_OPERATOR", 20],
  ["MATERIAL_MANAGER", 21],
  ["QUALITY_ENGINEER", 23],
  ["SYSTEM_ADMIN", 28],
] as const)(
  "%s includes the extended workflow and list controls",
  (role, count) => {
    const steps = ROLE_GUIDES[role];
    expect(steps).toHaveLength(count);
    expect(steps.some((step) => step.anchor === "pagination")).toBe(true);
    expect(
      steps.filter((step) => step.title === "목록 번호와 정렬을 읽습니다"),
    ).toHaveLength(1);
    expect(new Set(steps.map((step) => step.title)).size).toBe(count);
    expect(steps.at(-1)?.detail).toBeUndefined();
    for (const step of steps) {
      expect(step.title.length).toBeLessThanOrEqual(48);
      expect(step.description.length).toBeLessThanOrEqual(260);
    }
  },
);

it("retains prior completion and skip preferences when the content grows", () => {
  expect(guideStorageKey("demo user", "QUALITY_ENGINEER")).toBe(
    "fabriscope:onboarding:v3:demo%20user:QUALITY_ENGINEER",
  );
});

it("keeps the additional completion review behind execution permission and state fallback", () => {
  expect(
    ROLE_GUIDES.SHOP_FLOOR_OPERATOR.find(
      (step) => step.title === "양품·불량 합계를 제출 전에 검토합니다",
    ),
  ).toMatchObject({
    detail: "execution",
    permission: "process-execution:execute",
    fallbackAnchor: "execution-state",
  });
});

it("starts highest administrator guidance at the dashboard and covers all business screens", () => {
  const steps = ROLE_GUIDES.SYSTEM_ADMIN;
  expect(steps[0]?.to).toBe("/dashboard");
  expect(new Set(steps.map((step) => step.to))).toEqual(
    new Set([
      "/dashboard",
      "/work-orders",
      "/work-orders/new",
      "/materials/boms",
      "/materials/lots",
      "/execution/queue",
      "/quality/inspections",
      "/quality/incidents",
      "/traceability",
      "/admin/users",
      "/audit-events",
    ]),
  );
  expect(
    steps.some(
      (step) =>
        step.permission === "process-execution:execute" &&
        step.fallbackAnchor === "execution-state",
    ),
  ).toBe(true);
  expect(
    steps.some(
      (step) =>
        step.permission === "inspection:execute" &&
        step.fallbackAnchor === "inspection-summary",
    ),
  ).toBe(true);
  expect(
    steps.some((step) =>
      step.description.includes("역할 변경 기능은 제공하지 않습니다"),
    ),
  ).toBe(false);
  expect(guideStorageKey("admin", "SYSTEM_ADMIN")).toBe(
    "fabriscope:onboarding:v3:admin:SYSTEM_ADMIN",
  );
});
