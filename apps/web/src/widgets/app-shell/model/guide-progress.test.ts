import {
  guideStepKey,
  saveGuideProgress,
  readGuideProgress,
  clearGuideProgress,
} from "./guide-progress";
import { guideStorageKey, ROLE_GUIDES } from "./role-onboarding";

it("각 역할의 단계 식별자는 중복되지 않는다", () => {
  for (const steps of Object.values(ROLE_GUIDES))
    expect(new Set(steps.map(guideStepKey)).size).toBe(steps.length);
});

it("같은 단계와 선택 기록을 복원하고 다른 사용자·역할과 분리한다", () => {
  const key = guideStorageKey("progress-user", "PRODUCTION_PLANNER");
  const steps = ROLE_GUIDES.PRODUCTION_PLANNER;
  saveGuideProgress(
    key,
    steps[5]!,
    new Map([["work-order", { id: "order-42", context: "" }]]),
  );
  expect(readGuideProgress(key, steps)).toEqual({
    index: 5,
    records: new Map([["work-order", { id: "order-42", context: "" }]]),
  });
  expect(
    readGuideProgress(
      guideStorageKey("other-user", "PRODUCTION_PLANNER"),
      steps,
    ),
  ).toBeNull();
  expect(
    readGuideProgress(
      guideStorageKey("progress-user", "QUALITY_ENGINEER"),
      ROLE_GUIDES.QUALITY_ENGINEER,
    ),
  ).toBeNull();
  expect(
    readGuideProgress(
      key,
      steps.filter((_, i) => i !== 5),
    ),
  ).toBeNull();
  clearGuideProgress(key);
  expect(readGuideProgress(key, steps)).toBeNull();
});

it("깨진 저장 값은 무시하고 저장소 차단 시 메모리로 이어간다", () => {
  const key = guideStorageKey("invalid-progress", "SYSTEM_ADMIN");
  sessionStorage.setItem(key + ":progress:v1", "{bad json");
  expect(readGuideProgress(key, ROLE_GUIDES.SYSTEM_ADMIN)).toBeNull();
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  try {
    saveGuideProgress(key, ROLE_GUIDES.SYSTEM_ADMIN[2]!, new Map());
    expect(readGuideProgress(key, ROLE_GUIDES.SYSTEM_ADMIN)?.index).toBe(2);
    clearGuideProgress(key);
    expect(readGuideProgress(key, ROLE_GUIDES.SYSTEM_ADMIN)).toBeNull();
  } finally {
    get.mockRestore();
    set.mockRestore();
  }
});
