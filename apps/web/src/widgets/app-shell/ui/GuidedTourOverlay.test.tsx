import { fireEvent, render, screen } from "@testing-library/react";
import { GuidedTourOverlay } from "./GuidedTourOverlay";
import { TOUR_CARD_HEIGHT, TOUR_BOTTOM_SPACE } from "../model/tour-layout";
import { ROLE_GUIDES } from "../model/role-onboarding";

let target: HTMLButtonElement;
const callbacks = {
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onClose: vi.fn(),
  onPause: vi.fn(),
  onRetry: vi.fn(),
};
beforeEach(() => {
  target = document.createElement("button");
  target.textContent = "실제 대상";
  document.body.append(target);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const isCard = this.hasAttribute("data-tour-card");
      return {
        x: 300,
        y: 100,
        left: 300,
        top: 100,
        right: isCard ? 660 : 500,
        bottom: isCard ? 100 + TOUR_CARD_HEIGHT : 140,
        width: isCard ? 360 : 200,
        height: isCard ? TOUR_CARD_HEIGHT : 40,
        toJSON: () => ({}),
      };
    },
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => {
  target.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function overlay(element: HTMLElement | null = target) {
  return (
    <GuidedTourOverlay
      {...callbacks}
      step={ROLE_GUIDES.PRODUCTION_PLANNER[0]!}
      index={0}
      count={5}
      target={element}
      status={element ? "ready" : "loading"}
    />
  );
}
it("표의 다른 열을 안내할 때만 고정 열 겹침을 해제하고 종료 시 복원한다", () => {
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>사용자</th><th>역할</th></tr></thead>";
  document.body.append(table);
  const cell = table.querySelectorAll("th")[1]!;
  const view = render(overlay(cell));
  expect(table).toHaveAttribute("data-tour-column-focus", "true");
  expect(cell).toHaveFocus();
  view.rerender(overlay(null));
  expect(table).not.toHaveAttribute("data-tour-column-focus");
  expect(cell).not.toHaveAttribute("tabindex");
  table.remove();
});
it("입력의 초점은 유지하면서 제목·본문을 포함한 넓은 섹션을 강조한다", () => {
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("innerHeight", 1000);
  const section = document.createElement("section");
  section.setAttribute("data-tour-region", "true");
  document.body.append(section);
  section.append(target);
  section.getBoundingClientRect = vi.fn(
    () =>
      ({
        left: 300,
        top: 100,
        right: 1300,
        bottom: 800,
        width: 1000,
        height: 700,
      }) as DOMRect,
  );
  const view = render(overlay());
  expect(target).toHaveFocus();
  expect(section).toHaveAttribute("data-tour-region-active", "true");
  const ring = document.querySelector<HTMLElement>("[data-tour-spotlight]")!;
  expect(parseFloat(ring.style.width)).toBeGreaterThan(1000);
  expect(parseFloat(ring.style.height)).toBeGreaterThan(400);
  expect(
    parseFloat(ring.style.top) + parseFloat(ring.style.height),
  ).toBeLessThanOrEqual(1000 - TOUR_CARD_HEIGHT - 32);
  view.unmount();
  expect(section).not.toHaveAttribute("data-tour-region-active");
  section.remove();
});
it("이미 보이는 대상은 스크롤하지 않고 즉시 초점과 테두리를 맞춘다", () => {
  render(overlay());
  expect(target).toHaveFocus();
  expect(target.scrollIntoView).not.toHaveBeenCalled();
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(document.querySelector("[data-tour-spotlight]")).toHaveStyle({
    top: "94px",
    left: "294px",
  });
  fireEvent.resize(window);
  expect(target.scrollIntoView).not.toHaveBeenCalled();
  expect(document.body.style.paddingBottom).toBe(`${TOUR_BOTTOM_SPACE}px`);
});
it("다음 대상을 기다리는 동안 카드 위치를 유지하고 이전 강조는 즉시 제거한다", () => {
  const view = render(overlay());
  const card = screen.getByRole("dialog");
  const position = { left: card.style.left, top: card.style.top };
  view.rerender(overlay(null));
  expect(card).toHaveStyle(position);
  expect(card).toHaveFocus();
  expect(document.querySelector("[data-tour-spotlight]")).toBeNull();
  expect(target).not.toHaveAttribute("data-tour-active");
});
it("투어는 업무 화면이 보이는 반투명 강조를 유지한다", () => {
  const view = render(overlay());
  expect(
    document.querySelector<HTMLElement>("[data-tour-spotlight]")!.style
      .boxShadow,
  ).toContain("var(--color-overlay)");
  view.rerender(overlay(null));
  expect(document.querySelector("[data-guided-tour] > div")).toHaveClass(
    "bg-overlay",
  );
});
it("배경 휠·터치·Page Down을 차단하고 안내창 내부 스크롤은 허용한다", () => {
  render(overlay());
  expect(fireEvent.wheel(target, { deltaY: 200 })).toBe(false);
  expect(fireEvent.touchMove(target)).toBe(false);
  expect(fireEvent.keyDown(target, { key: "PageDown" })).toBe(false);
  expect(fireEvent.wheel(screen.getByRole("dialog"), { deltaY: 200 })).toBe(
    true,
  );
});
it("긴 설명의 키보드 스크롤은 본문만 움직이고 단계가 바뀌면 복원된다", () => {
  const view = render(overlay());
  const card = screen.getByRole("dialog");
  const copy = document.querySelector<HTMLElement>("[data-tour-copy]")!;
  fireEvent.keyDown(target, { key: "Tab" });
  expect(screen.getByRole("button", { name: "투어 종료" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(screen.getByRole("region", { name: "안내 설명" })).toHaveFocus();
  copy.scrollTo = vi.fn();
  Object.defineProperty(copy, "clientHeight", { value: 120 });
  fireEvent.keyDown(card, { key: "PageDown" });
  expect(copy.scrollTo).toHaveBeenCalledWith({ top: 120, behavior: "instant" });
  expect(copy).not.toContainElement(
    screen.getByRole("button", { name: "다음" }),
  );
  expect(copy).not.toContainElement(screen.getByRole("heading", { level: 2 }));
  copy.scrollTop = 100;
  view.rerender(
    <GuidedTourOverlay
      {...callbacks}
      step={ROLE_GUIDES.PRODUCTION_PLANNER[1]!}
      index={1}
      count={18}
      target={target}
      status="ready"
    />,
  );
  expect(copy.scrollTop).toBe(0);
  expect(card).toHaveStyle({ height: TOUR_CARD_HEIGHT + "px" });
});
it("단계 전환과 대기·오류 상태에서도 제목과 본문을 교체하거나 페이드하지 않는다", () => {
  const view = render(overlay());
  const heading = screen.getByRole("heading", { level: 2 });
  const description = document.getElementById("guided-tour-description")!;
  for (const status of [
    "loading",
    "missing",
    "error",
    "limited",
    "ready",
  ] as const) {
    view.rerender(
      <GuidedTourOverlay
        {...callbacks}
        step={ROLE_GUIDES.PRODUCTION_PLANNER[1]!}
        index={1}
        count={24}
        target={status === "ready" ? target : null}
        status={status}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toBe(heading);
    expect(document.getElementById("guided-tour-description")).toBe(
      description,
    );
    expect(heading).not.toHaveClass("animate-in", "fade-in");
    expect(description).not.toHaveClass("animate-in", "fade-in");
    expect(description).toHaveClass("text-base", "text-text-strong");
    expect(heading).toHaveTextContent(ROLE_GUIDES.PRODUCTION_PLANNER[1]!.title);
    expect(document.querySelector("[data-tour-copy]")).not.toContainElement(
      heading,
    );
  }
});
it("모바일 안내창은 추가 스크롤 없이 종료 시 확보한 여백을 복원한다", () => {
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  const view = render(overlay());
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(target.scrollIntoView).not.toHaveBeenCalled();
  expect(document.body.style.paddingBottom).toBe(`${TOUR_BOTTOM_SPACE}px`);
  view.unmount();
  expect(document.body.style.paddingBottom).toBe("");
});
