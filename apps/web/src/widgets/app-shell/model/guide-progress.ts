import { useSyncExternalStore } from "react";
import type { RoleCode } from "@/entities/session";
import {
  availableGuideSteps,
  guideStorageKey,
  type GuideStep,
} from "./role-onboarding";
import type { NavigationGroup } from "./navigation";
import type { TourRecord } from "./tour-destination";

const CHANGE = "mes:guide-progress";
const memory = new Map<string, string>();
const kinds = new Set([
  "work-order",
  "execution",
  "material-lot",
  "inspection",
  "incident",
  "trace-node",
]);
const progressKey = (key: string) => key + ":progress:v1";
export const guideStepKey = (step: GuideStep) =>
  step.id ?? JSON.stringify([step.to, step.detail ?? "", step.anchor]);

function snapshot(key: string) {
  try {
    return sessionStorage.getItem(progressKey(key)) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function parse(raw: string | null, steps: readonly GuideStep[]) {
  if (!raw || raw.length > 16000) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("step" in data) ||
      !("records" in data)
    )
      return null;
    const index = steps.findIndex((step) => guideStepKey(step) === data.step);
    if (index < 0 || !data.records || typeof data.records !== "object")
      return null;
    const records = new Map<string, TourRecord>();
    for (const [kind, record] of Object.entries(data.records)) {
      if (!kinds.has(kind) || !record || typeof record !== "object") continue;
      const { id, context } = record as Partial<TourRecord>;
      if (
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= 200 &&
        typeof context === "string" &&
        context.length <= 200
      )
        records.set(kind, { id, context });
    }
    return { index, records };
  } catch {
    return null;
  }
}

export function readGuideProgress(key: string, steps: readonly GuideStep[]) {
  return parse(snapshot(key), steps);
}

export function saveGuideProgress(
  key: string,
  step: GuideStep,
  records: ReadonlyMap<string, TourRecord | null>,
) {
  const value = JSON.stringify({
    step: guideStepKey(step),
    records: Object.fromEntries(
      [...records].filter(([, record]) => record !== null),
    ),
  });
  memory.set(key, value);
  try {
    sessionStorage.setItem(progressKey(key), value);
  } catch {
    /* 같은 탭의 메모리 복구는 유지한다. */
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function clearGuideProgress(key: string) {
  memory.delete(key);
  try {
    sessionStorage.removeItem(progressKey(key));
  } catch {
    /* 저장소가 차단되어도 종료할 수 있다. */
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}

/** 같은 탭에서 새로고침·문서 이동을 해도 사용자와 역할에 맞는 진행만 표시한다. */
export function useRoleGuideProgress(
  userId: string,
  role: RoleCode,
  navigation: NavigationGroup[],
  permissions: readonly string[],
) {
  const key = guideStorageKey(userId, role);
  const raw = useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    () => null,
  );
  const steps = availableGuideSteps(role, navigation, permissions);
  const progress = parse(raw, steps);
  const step = progress && steps[progress.index];
  return progress && step
    ? {
        index: progress.index,
        count: steps.length,
        title: step.title,
        screen: step.screen,
      }
    : null;
}
