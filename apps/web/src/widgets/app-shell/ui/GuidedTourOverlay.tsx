import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Compass, Pause, X } from "lucide-react";
import { Button } from "@/shared/ui";
import type { GuideStep } from "../model/role-onboarding";
import { positionTourCard, tourCardWidth, type TourRect } from "../model/tour-target";
import { tourRegion } from "../model/tour-region";
import {
  TOUR_CARD_HEIGHT,
  TOUR_CARD_WIDTH,
  TOUR_BOTTOM_SPACE,
} from "../model/tour-layout";

export function GuidedTourOverlay({
  step,
  index,
  count,
  target,
  status,
  onPrevious,
  onNext,
  onClose,
  onPause,
  onRetry,
}: {
  step: GuideStep;
  index: number;
  count: number;
  target: HTMLElement | null;
  status: "loading" | "ready" | "missing" | "error" | "limited";
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onPause: () => void;
  onRetry: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const keyboardMovePending = useRef(false);
  useEffect(() => {
    if (status !== "loading") keyboardMovePending.current = false;
  }, [index, status]);
  useLayoutEffect(() => {
    if (copyRef.current) copyRef.current.scrollTop = 0;
  }, [index, step.title]);
  const [geometry, setGeometry] = useState(() => ({
    rect: null as TourRect | null,
    width: tourCardWidth(null, document.documentElement.clientWidth || innerWidth),
    ...positionTourCard(
      null,
      document.documentElement.clientWidth || innerWidth,
      innerHeight,
      Math.min(
        TOUR_CARD_WIDTH,
        (document.documentElement.clientWidth || innerWidth) - 32,
      ),
      TOUR_CARD_HEIGHT,
    ),
  }));
  const measure = useCallback(() => {
    const viewportWidth = document.documentElement.clientWidth || innerWidth;
    const region = target?.isConnected ? tourRegion(target) : null;
    const r = region?.getBoundingClientRect();
    const card = cardRef.current?.getBoundingClientRect();
    const height = card?.height || Math.min(TOUR_CARD_HEIGHT, innerHeight - 32);
    const fullRect = r
      ? {
          left: Math.max(4, r.left - 6),
          top: Math.max(80, r.top - 6),
          right: Math.min(viewportWidth - 4, r.right + 6),
          bottom: Math.min(innerHeight - 4, r.bottom + 6),
          width: 0,
          height: 0,
        }
      : null;
    if (fullRect) {
      fullRect.width = Math.max(0, fullRect.right - fullRect.left);
      fullRect.height = Math.max(0, fullRect.bottom - fullRect.top);
    }
    setGeometry((previous) => {
      const width = fullRect
        ? tourCardWidth(fullRect, viewportWidth)
        : Math.min(previous.width, tourCardWidth(null, viewportWidth));
      const pos =
        !fullRect && viewportWidth >= 768
          ? {
              left: Math.max(
                16,
                Math.min(previous.left, viewportWidth - width - 16),
              ),
              top: Math.max(
                16,
                Math.min(previous.top, innerHeight - height - 16),
              ),
            }
          : positionTourCard(
              fullRect,
              viewportWidth,
              innerHeight,
              width,
              height,
            );
      const rect = fullRect ? { ...fullRect } : null;
      // A long section remains visible above the guide instead of being reduced to one field.
      // Clip only the viewport portion occupied by the card; never clone or shrink business UI.
      if (
        rect &&
        rect.left < pos.left + width &&
        rect.right > pos.left &&
        rect.top < pos.top + height &&
        rect.bottom > pos.top
      ) {
        rect.bottom = Math.max(rect.top, pos.top - 16);
        rect.height = Math.max(0, rect.bottom - rect.top);
      }
      const next = { rect, width, ...pos };
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  }, [target]);

  useLayoutEffect(() => {
    const bodyPadding = document.body.style.paddingBottom;
    const reserveSpace = () => {
      // Wide section spotlights also need room below short desktop pages.
      const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 0;
      document.body.style.paddingBottom = `${Math.max(TOUR_BOTTOM_SPACE, cardHeight + 60)}px`;
    };
    reserveSpace();
    window.addEventListener("resize", reserveSpace);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reserveSpace);
    if (cardRef.current) observer?.observe(cardRef.current);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reserveSpace);
      document.body.style.paddingBottom = bodyPadding;
    };
  }, []);

  useLayoutEffect(() => {
    if (!target) {
      cardRef.current?.focus({ preventScroll: true });
      measure();
      return;
    }
    // A pinned identifier column must not cover the column being explained.
    // Static positioning preserves table layout; normal sticky behavior returns on exit.
    const table = target.matches("th:not(:first-child)")
      ? target.closest("table")
      : null;
    const oldColumnFocus =
      table?.getAttribute("data-tour-column-focus") ?? null;
    table?.setAttribute("data-tour-column-focus", "true");
    const region = tourRegion(target);
    const oldRegionActive = region.getAttribute("data-tour-region-active");
    region.setAttribute("data-tour-region-active", "true");
    const oldTab = target.getAttribute("tabindex"),
      oldDescription = target.getAttribute("aria-describedby"),
      oldActive = target.getAttribute("data-tour-active"),
      oldReadOnly = target.getAttribute("readonly");
    if (!target.matches("input, button, a[href], select, textarea, [tabindex]"))
      target.setAttribute("tabindex", "-1");
    target.setAttribute(
      "aria-describedby",
      [oldDescription, "guided-tour-title", "guided-tour-description"]
        .filter(Boolean)
        .join(" "),
    );
    target.setAttribute("data-tour-active", "true");
    if (target.matches("input, textarea")) target.setAttribute("readonly", "");
    // The route controller has finished scrolling; show the target without another jump.
    target.focus({ preventScroll: true });
    measure();
    return () => {
      if (table) {
        if (oldColumnFocus === null)
          table.removeAttribute("data-tour-column-focus");
        else table.setAttribute("data-tour-column-focus", oldColumnFocus);
      }
      if (oldRegionActive === null)
        region.removeAttribute("data-tour-region-active");
      else region.setAttribute("data-tour-region-active", oldRegionActive);
      for (const [name, value] of [
        ["tabindex", oldTab],
        ["aria-describedby", oldDescription],
        ["data-tour-active", oldActive],
        ["readonly", oldReadOnly],
      ]) {
        if (value === null) target.removeAttribute(name!);
        else target.setAttribute(name!, value!);
      }
    };
  }, [target, measure]);

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (target) {
      observer?.observe(target);
      observer?.observe(tourRegion(target));
    }
    if (cardRef.current) observer?.observe(cardRef.current);
    const resize = update;
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [measure, target]);

  useEffect(() => {
    const closeOnBack = () => onPause();
    const block = (event: Event) => {
      if (!cardRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onPause();
        return;
      }
      if (
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat || status === "loading" || keyboardMovePending.current) return;
        if (event.key === "ArrowLeft" && index === 0) return;
        keyboardMovePending.current = true;
        if (event.key === "ArrowLeft") onPrevious();
        else onNext();
        return;
      }
      if (
        ["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(
          event.key,
        ) &&
        cardRef.current?.contains(event.target as Node)
      ) {
        const card = copyRef.current ?? cardRef.current;
        event.preventDefault();
        event.stopImmediatePropagation();
        const top =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? card.scrollHeight
              : card.scrollTop +
                (event.key === "PageUp" || event.key === "ArrowUp" ? -1 : 1) *
                  (event.key.startsWith("Page") ? card.clientHeight : 40);
        card.scrollTo({ top, behavior: "instant" });
        return;
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          cardRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href], [data-tour-copy]",
          ) ?? [],
        );
        const cycle = target?.isConnected ? [target, ...controls] : controls;
        if (!cycle.length) return;
        const current = cycle.indexOf(document.activeElement as HTMLElement);
        const next =
          current < 0
            ? event.shiftKey
              ? cycle.length - 1
              : 0
            : (current + (event.shiftKey ? -1 : 1) + cycle.length) %
              cycle.length;
        event.preventDefault();
        event.stopImmediatePropagation();
        cycle[next]?.focus({ preventScroll: true });
        return;
      }
      if (
        !cardRef.current?.contains(event.target as Node) &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key.length === 1 ||
          [
            "Enter",
            "Backspace",
            "Delete",
            "ArrowUp",
            "ArrowDown",
            "PageUp",
            "PageDown",
            "Home",
            "End",
          ].includes(event.key))
      )
        block(event);
    };
    document.addEventListener("keydown", keydown, true);
    for (const name of ["click", "beforeinput", "submit"])
      document.addEventListener(name, block, true);
    // Background wheel/touch scrolling otherwise makes the card chase the target.
    for (const name of ["wheel", "touchmove"])
      document.addEventListener(name, block, { capture: true, passive: false });
    window.addEventListener("popstate", closeOnBack);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      for (const name of ["click", "beforeinput", "submit"])
        document.removeEventListener(name, block, true);
      for (const name of ["wheel", "touchmove"])
        document.removeEventListener(name, block, true);
      window.removeEventListener("popstate", closeOnBack);
    };
  }, [target, onPause, onPrevious, onNext, index, status]);

  return createPortal(
    <div
      data-guided-tour="active"
      className="pointer-events-none fixed inset-0 z-[100]"
    >
      <div
        aria-hidden="true"
        className={
          "pointer-events-auto absolute inset-0 " +
          (target && geometry.rect ? "" : "bg-overlay")
        }
      />
      {target && geometry.rect ? (
        <div
          data-tour-spotlight="true"
          aria-hidden="true"
          className="fixed rounded-xl border-2 border-accent-strong"
          style={{
            left: geometry.rect.left,
            top: geometry.rect.top,
            width: geometry.rect.width,
            height: geometry.rect.height,
            boxShadow: "0 0 0 9999px var(--color-overlay)",
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-busy={status === "loading"}
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-description"
        tabIndex={-1}
        data-tour-card="true"
        className="pointer-events-auto fixed flex h-80 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[360px] flex-col overflow-hidden rounded-panel border border-border bg-surface p-4 font-sans text-text-strong shadow-panel outline-none sm:p-5 md:h-auto md:min-h-80 md:max-w-[440px]"
        style={{
          width: geometry.width,
          left: Math.round(geometry.left),
          top: Math.round(geometry.top),
        }}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-accent-strong">
            <Compass className="size-4" aria-hidden="true" />
            {step.screen}
          </span>
          <span className="text-xs text-text-muted">
            {index + 1} / {count}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="-my-2 -mr-2"
            aria-label="투어 종료"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label="사용 안내 진행률"
          aria-valuemin={0}
          aria-valuemax={count}
          aria-valuenow={index + 1}
          className="mb-3 h-1 shrink-0 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full bg-accent-strong transition-[width] duration-200 motion-reduce:transition-none"
            style={{ width: ((index + 1) / count) * 100 + "%" }}
          />
        </div>
        <h2
          id="guided-tour-title"
          className="mb-2 shrink-0 text-lg font-bold leading-7"
        >
          {step.title}
        </h2>
        <div
          ref={copyRef}
          data-tour-copy="true"
          role="region"
          aria-label="안내 설명"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:flex-auto"
        >
          <p
            id="guided-tour-description"
            className="text-base font-medium leading-[1.625] text-text-strong"
          >
            {step.description}
          </p>
          <p
            role="status"
            className="mt-3 rounded-control bg-surface-subtle px-3 py-2 text-sm leading-5 text-text"
          >
            {status === "loading"
              ? "화면을 이동하고 안내 대상을 찾는 중입니다…"
              : status === "limited"
                ? "현재 상태에서는 이 입력란이 표시되지 않아 관련 상태 영역을 강조했습니다. 조건을 확인하고 다음 단계로 진행하세요."
                : status === "missing"
                  ? "현재 데이터나 화면 상태에서 안내 대상을 찾지 못했습니다. 다시 찾거나 다음 단계를 확인하세요."
                  : status === "error"
                    ? "화면 이동을 완료하지 못했습니다. 다시 시도하거나 투어를 종료할 수 있습니다."
                    : "화면을 직접 사용하려면 일시중지하세요. 안내는 같은 단계에서 이어집니다."}
          </p>
          {status === "missing" || status === "error" ? (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={onRetry}
            >
              다시 찾기
            </Button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            variant="secondary"
            className="shrink-0 border-accent-strong/50 bg-accent-soft px-2 text-accent-strong hover:border-accent-strong hover:bg-accent-soft [&>span]:gap-1.5"
            onClick={onPause}
            aria-keyshortcuts="Escape"
          >
            <Pause className="size-4 shrink-0" aria-hidden="true" />
            일시중지
          </Button>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              aria-label="이전 단계"
              aria-keyshortcuts="ArrowLeft"
              disabled={index === 0 || status === "loading"}
              onClick={onPrevious}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              className="px-3"
              disabled={status === "loading"}
              onClick={onNext}
              aria-keyshortcuts="ArrowRight"
            >
              {index === count - 1 ? "안내 완료" : "다음"}
              {index === count - 1 ? (
                <Check
                  className="hidden size-4 min-[360px]:block"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight
                  className="hidden size-4 min-[360px]:block"
                  aria-hidden="true"
                />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 shrink-0 text-center text-sm leading-5 text-text-muted">
          ← 이전 · → 다음 · Esc 일시중지
        </p>
      </div>
    </div>,
    document.body,
  );
}
