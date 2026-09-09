import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass, Play, X } from "lucide-react";
import type { RoleCode } from "@/entities/session";
import { readNavigationSafety } from "@/shared/lib";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui";
import type { NavigationGroup } from "../model/navigation";
import {
  availableGuideSteps,
  guideStorageKey,
  hasGuideDecision,
  saveGuideDecision,
} from "../model/role-onboarding";
import {
  destinationPath,
  recordKind,
  tourDestination,
  type TourRecord,
} from "../model/tour-destination";
import { waitForTourTarget } from "../model/tour-target";
import { scrollToTourTarget } from "../model/tour-scroll";
import { clearLoginGuide, hasLoginGuide } from "../model/login-guide-intent";
import { ROLE_GUIDE_REQUEST } from "../model/onboarding-launcher";
import { GuidedTourOverlay } from "./GuidedTourOverlay";
import {
  clearGuideProgress,
  readGuideProgress,
  saveGuideProgress,
} from "../model/guide-progress";

export function RoleOnboarding({
  userId,
  roleCode,
  roleLabel,
  navigation,
  permissions = [],
  ready = true,
}: {
  userId: string;
  roleCode: RoleCode;
  roleLabel: string;
  navigation: NavigationGroup[];
  permissions?: readonly string[];
  ready?: boolean;
}) {
  const navigate = useNavigate();
  const storageKey = guideStorageKey(userId, roleCode);
  const steps = availableGuideSteps(roleCode, navigation, permissions);
  const [continueLoginGuide] = useState(() => hasLoginGuide(roleCode));
  const [restored] = useState(() => readGuideProgress(storageKey, steps));
  const [phase, setPhase] = useState<"closed" | "invite" | "tour" | "paused">(
    () =>
      steps.length === 0
        ? "closed"
        : continueLoginGuide
          ? "tour"
          : restored
            ? "paused"
            : !hasGuideDecision(storageKey)
              ? "invite"
              : "closed",
  );
  const loginGuideHandled = useRef(false);
  const [stepIndex, setStepIndex] = useState(
    continueLoginGuide ? 0 : (restored?.index ?? 0),
  );
  const [dockDismissed, setDockDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "loading" | "ready" | "missing" | "error" | "limited"
  >("loading");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [notice, setNotice] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touringRef = useRef(phase === "tour");
  const recordsRef = useRef(
    new Map<string, TourRecord | null>(
      continueLoginGuide ? [] : restored?.records,
    ),
  );
  const runRef = useRef<AbortController | null>(null);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const finish = useCallback(
    (decision: "completed" | "skipped" = "skipped") => {
      runRef.current?.abort();
      touringRef.current = false;
      saveGuideDecision(storageKey, decision);
      clearGuideProgress(storageKey);
      setPhase("closed");
      setTarget(null);
      requestAnimationFrame(() =>
        triggerRef.current?.focus({ preventScroll: true }),
      );
    },
    [storageKey],
  );
  const stop = useCallback(() => finish(), [finish]);
  const pause = useCallback(() => {
    runRef.current?.abort();
    if (step) saveGuideProgress(storageKey, step, recordsRef.current);
    touringRef.current = false;
    setTarget(null);
    setPhase("paused");
    setDockDismissed(false);
    requestAnimationFrame(() =>
      triggerRef.current?.focus({ preventScroll: true }),
    );
  }, [step, storageKey]);

  const begin = useCallback(
    (resume: boolean) => {
      setDockDismissed(false);
      setNotice("");
      const safety = readNavigationSafety();
      if (safety.pending) {
        setNotice(
          "저장 중인 작업이 있습니다. 처리가 끝난 뒤 안내를 시작해 주세요.",
        );
        setPhase((previous) => (previous === "closed" ? "invite" : previous));
        return;
      }
      if (
        safety.dirty &&
        !window.confirm(
          "저장하지 않은 입력 내용이 있습니다. 실제 화면을 이동하면 이 내용이 사라질 수 있습니다. 입력 내용을 버리고 안내를 시작하시겠어요?",
        )
      )
        return;
      const saved = resume ? readGuideProgress(storageKey, steps) : null;
      recordsRef.current = new Map(saved?.records);
      setStepIndex(saved?.index ?? 0);
      setNotice("");
      setStatus("loading");
      setTarget(null);
      touringRef.current = true;
      setPhase("tour");
    },
    [storageKey, steps],
  );

  useEffect(() => {
    if (phase === "tour" && step)
      saveGuideProgress(storageKey, step, recordsRef.current);
  }, [phase, step, storageKey, status]);

  useEffect(() => {
    if (phase !== "tour" || !step || !ready) return;
    const controller = new AbortController();
    runRef.current = controller;
    const run = async () => {
      try {
        const signal = controller.signal;
        if (continueLoginGuide && !loginGuideHandled.current) {
          loginGuideHandled.current = true;
          clearLoginGuide();
          const safety = readNavigationSafety();
          if (safety.dirty || safety.pending) {
            touringRef.current = false;
            setNotice(
              "진행 중인 입력이나 저장이 있어 자동 안내를 멈췄습니다. 작업 상태를 확인한 뒤 시작해 주세요.",
            );
            setPhase("invite");
            return;
          }
        }
        if (step.detail) {
          const kind = recordKind(step.detail);
          if (!recordsRef.current.has(kind)) {
            if (window.location.pathname !== step.to)
              await navigate({
                to: step.to,
                search: {},
                replace: true,
                resetScroll: false,
              });
            if (signal.aborted) return;
            const row = await waitForTourTarget("record-" + kind, signal);
            if (signal.aborted) return;
            const id = row?.dataset.tourRecordId;
            const context = row?.dataset.tourContext ?? "";
            recordsRef.current.set(
              kind,
              id && (kind !== "execution" || context) ? { id, context } : null,
            );
          }
          const record = recordsRef.current.get(kind);
          if (!record) {
            setTarget(null);
            setStatus("missing");
            return;
          }
          const destination = tourDestination(step.detail, record);
          if (window.location.pathname !== destinationPath(destination))
            await navigate({
              ...destination,
              search: {},
              replace: true,
              resetScroll: false,
            });
        } else if (
          window.location.pathname !== step.to ||
          (step.tab &&
            (new URLSearchParams(window.location.search).get("tab") ?? "users") !==
              step.tab)
        ) {
          await navigate({
            to: step.to,
            search: step.tab === "roles" ? { tab: "roles" } : {},
            replace: true,
            resetScroll: false,
          });
        }
        if (signal.aborted) return;
        // The base section and conditional form render together. Wait for the base,
        // then use the actual input if available, otherwise explain its state condition.
        const fallback = step.fallbackAnchor
          ? await waitForTourTarget(step.fallbackAnchor, signal)
          : null;
        if (signal.aborted) return;
        const primary = await waitForTourTarget(
          step.anchor,
          signal,
          fallback ? 100 : 6000,
        );
        const element = primary ?? fallback;
        if (controller.signal.aborted) return;
        if (element) await scrollToTourTarget(element, controller.signal);
        if (controller.signal.aborted) return;
        setTarget(element);
        setStatus(primary ? "ready" : fallback ? "limited" : "missing");
      } catch {
        if (!controller.signal.aborted) {
          setTarget(null);
          setStatus("error");
        }
      }
    };
    // Other mounted editors register their dirty/pending state in passive effects.
    // Wait one frame before consuming login consent so their safety checks are in place.
    let frame: number | undefined;
    if (continueLoginGuide && !loginGuideHandled.current)
      frame = requestAnimationFrame(() => void run());
    else void run();
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [phase, step, attempt, navigate, ready, continueLoginGuide]);

  useEffect(() => {
    const invite = (event: Event) => {
      if (!touringRef.current) {
        if ((event as CustomEvent<{ restart?: boolean }>).detail?.restart) {
          begin(false);
          return;
        }
        if (readGuideProgress(storageKey, steps)) {
          begin(true);
          return;
        }
        setNotice("");
        setPhase("invite");
      }
    };
    window.addEventListener(ROLE_GUIDE_REQUEST, invite);
    return () => window.removeEventListener(ROLE_GUIDE_REQUEST, invite);
  }, [begin, storageKey, steps]);

  if (!step) return null;

  function move(index: number) {
    runRef.current?.abort();
    setTarget(null);
    setStatus("loading");
    setStepIndex(index);
  }
  const menuItems = navigation.flatMap((group) => group.items);
  const screens = [
    ...new Map(
      steps.map((item) => {
        const path = item.to === "/work-orders/new" ? "/work-orders" : item.to;
        return [
          path,
          menuItems.find((menu) => menu.to === path)?.label ?? item.screen,
        ];
      }),
    ).values(),
  ];

  return (
    <>
      <Dialog
        open={phase === "invite" && ready}
        onOpenChange={(next) => {
          if (!ready) return;
          if (next) {
            if (phase === "paused") {
              begin(true);
              return;
            }
            setNotice("");
            setPhase("invite");
          } else if (!touringRef.current) finish();
        }}
      >
        <DialogTrigger asChild>
          <Button
            ref={triggerRef}
            disabled={!ready}
            variant="ghost"
            className="size-11 shrink-0 px-2 md:w-auto lg:h-9"
            aria-label="역할별 사용 안내"
            title="역할별 사용 안내"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            <span className="hidden md:inline">
              {phase === "paused" ? "안내 재개" : "사용 안내"}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-panel border-border bg-surface p-0 shadow-panel sm:max-w-xl"
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!touringRef.current)
              triggerRef.current?.focus({ preventScroll: true });
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3"
            aria-label="사용 안내 닫기"
            onClick={() => finish()}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
          <div className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-5 pr-14 sm:px-6 sm:pr-14">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
              <Compass className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold text-text-muted">
                FabriScope MES · 실제 화면 투어
              </p>
              <p className="mt-1 text-sm font-semibold text-text-strong">
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
            <div>
              <DialogTitle className="text-xl font-bold leading-8 text-text-strong">
                사용 안내를 시작하시겠어요?
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-text-muted">
                실제 업무 화면으로 이동하며 확인할 곳을 짚어 드립니다. 목록부터
                상세까지 둘러보며, 데이터는 변경하지 않습니다.
              </DialogDescription>
            </div>
            <div className="rounded-panel border border-border bg-surface-subtle p-4">
              <p className="mb-3 text-sm font-semibold text-text-muted">
                {screens.length}개 메뉴 · 목록과 상세를 포함한 {steps.length}
                단계
              </p>
              <ol
                className="grid grid-cols-2 gap-x-4 gap-y-2"
                aria-label="안내할 화면"
              >
                {screens.map((screen, index) => (
                  <li
                    key={screen}
                    className="flex items-center gap-2 text-sm leading-6 text-text-strong"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold">
                      {index + 1}
                    </span>
                    {screen}
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-sm leading-6 text-text-muted">
              일시중지 후 상단 사용 안내·업무 가이드에서 이어서 볼 수 있습니다.
            </p>
            {notice ? (
              <p role="alert" className="text-sm leading-6 text-danger-strong">
                {notice}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
            <Button variant="secondary" onClick={() => finish()}>
              지금은 건너뛰기
            </Button>
            <Button onClick={() => begin(false)}>
              네, 시작할게요{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {phase === "tour" && ready ? (
        <GuidedTourOverlay
          step={step}
          index={stepIndex}
          count={steps.length}
          target={target}
          status={status}
          onClose={stop}
          onPause={pause}
          onPrevious={() => move(Math.max(0, stepIndex - 1))}
          onNext={() =>
            stepIndex === steps.length - 1
              ? finish("completed")
              : move(stepIndex + 1)
          }
          onRetry={() => {
            if (step.detail) recordsRef.current.delete(recordKind(step.detail));
            setTarget(null);
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}
      {phase === "paused" && ready && !dockDismissed ? createPortal(
        <section
          data-guided-tour="paused"
          aria-label="일시중지한 사용 안내"
          className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-panel border border-border bg-surface p-4 text-text-strong shadow-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              사용 안내 일시중지 · {stepIndex + 1}/{steps.length}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="-my-2 -mr-2"
              aria-label="재개 알림 숨기기"
              onClick={() => setDockDismissed(true)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm leading-5 text-text-muted">
              {step.screen} 화면부터 이어서 볼 수 있습니다.
            </p>
            <Button onClick={() => begin(true)}>
              <Play className="size-4" aria-hidden="true" />
              이어서 보기
            </Button>
          </div>
          {notice ? (
            <p role="alert" className="mt-2 text-sm text-danger-strong">
              {notice}
            </p>
          ) : null}
        </section>, document.body
      ) : null}
    </>
  );
}
