import { positionTourCard, tourCardWidth, waitForTourTarget } from "./tour-target";

it.each([
  { left: 402, right: 1759, viewport: 1904, width: 370, side: "left" },
  { left: 145, right: 1502, viewport: 1904, width: 370, side: "right" },
  { left: 550, right: 1800, viewport: 1920, width: 440, side: "left" },
])("fits a readable card beside a tall section: $side $width", ({ left, right, viewport, width, side }) => {
  const rect = { left, right, width: right - left, top: 82, bottom: 812, height: 730 };
  const cardWidth = tourCardWidth(rect, viewport);
  expect(cardWidth).toBe(width);
  const position = positionTourCard(rect, viewport, 940, cardWidth, 470);
  expect(position.top).toBe(rect.top);
  if (side === "left") expect(position.left + cardWidth + 16).toBeLessThanOrEqual(rect.left);
  else expect(position.left).toBeGreaterThanOrEqual(rect.right + 16);
});

it("keeps full reading width when neither side fits and preserves mobile sizing", () => {
  expect(tourCardWidth({ left: 280, right: 1400 }, 1440)).toBe(440);
  expect(tourCardWidth({ left: 16, right: 374 }, 390)).toBe(358);
});

it.each([
  { top: 674, left: 16, right: 810, bottom: 780, width: 794, height: 106 },
  { top: -200, left: 16, right: 810, bottom: -100, width: 794, height: 100 },
  { top: 100, left: -600, right: -500, bottom: 200, width: 100, height: 100 },
  { top: 100, left: 1100, right: 1200, bottom: 200, width: 100, height: 100 },
])("회전 후 대상이 화면 밖에 있어도 안내 카드는 화면 안에 둔다", (rect) => {
  const position = positionTourCard(rect, 844, 390, 360, 320);
  expect(position.left).toBeGreaterThanOrEqual(16);
  expect(position.left + 360).toBeLessThanOrEqual(828);
  expect(position.top).toBeGreaterThanOrEqual(16);
  expect(position.top + 320).toBeLessThanOrEqual(374);
});

it("좁은 화면에서 안내 카드를 화면 안에 배치한다", () => {
  const position = positionTourCard(
    { top: 90, left: 16, right: 280, bottom: 140, width: 264, height: 50 },
    320,
    640,
    288,
    360,
  );
  expect(position).toEqual({ left: 16, top: 264 });
});
it("넓은 화면에서 대상 오른쪽 공간을 우선 사용한다", () => {
  const position = positionTourCard(
    { top: 100, left: 300, right: 500, bottom: 150, width: 200, height: 50 },
    1440,
    1000,
    360,
    300,
  );
  expect(position).toEqual({ left: 516, top: 100 });
});
it("모바일 로딩과 준비 상태에서 안내 카드 위치가 같다", () => {
  const rect = {
    top: 88,
    left: 16,
    right: 350,
    bottom: 128,
    width: 334,
    height: 40,
  };
  expect(positionTourCard(null, 390, 844, 358, 360)).toEqual(
    positionTourCard(rect, 390, 844, 358, 360),
  );
});
it("데스크톱 첫 로딩은 화면 중앙이 아닌 하단에서 시작한다", () => {
  expect(positionTourCard(null, 1440, 844, 360, 360)).toEqual({
    left: 1064,
    top: 468,
  });
});
it("넓은 섹션 아래에서는 안내 카드를 섹션 중앙에 배치한다", () => {
  expect(
    positionTourCard(
      {
        top: 100,
        left: 280,
        right: 1400,
        bottom: 480,
        width: 1120,
        height: 380,
      },
      1440,
      1000,
      360,
      320,
    ),
  ).toEqual({ left: 660, top: 496 });
});
it("타깃 탐색은 종료 시 취소된다", async () => {
  const controller = new AbortController();
  const pending = waitForTourTarget("missing", controller.signal);
  controller.abort();
  await expect(pending).resolves.toBeNull();
});
it("상세 예시는 현재 목록에서 우선 대상 표시가 있는 행을 선택한다", async () => {
  const list = document.createElement("div");
  list.innerHTML =
    '<div data-tour="record-execution"></div><div data-tour="record-execution" data-tour-preferred="true"></div>';
  document.body.append(list);
  const preferred = list.lastElementChild as HTMLElement;
  vi.spyOn(preferred, "getBoundingClientRect").mockReturnValue({
    width: 100,
  } as DOMRect);
  await expect(
    waitForTourTarget("record-execution", new AbortController().signal),
  ).resolves.toBe(preferred);
  list.remove();
});
it("없는 타깃을 영구히 기다리지 않는다", async () => {
  await expect(
    waitForTourTarget("missing", new AbortController().signal, 5),
  ).resolves.toBeNull();
});

it.each(["replace", "reuse"])(
  "로딩용 표를 제외하고 실제 표가 준비되면 찾는다: %s",
  async (mode) => {
    const region = document.createElement("div");
    region.dataset.loadingPlaceholder = "true";
    region.innerHTML = '<div data-tour="table-heading">조회 중</div>';
    document.body.append(region);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 100,
    } as DOMRect);
    const completed = vi.fn();
    const pending = waitForTourTarget(
      "table-heading",
      new AbortController().signal,
    ).then(completed);
    try {
      await Promise.resolve();
      expect(completed).not.toHaveBeenCalled();
      if (mode === "replace")
        region.innerHTML = '<div data-tour="table-heading">실제 목록</div>';
      region.removeAttribute("data-loading-placeholder");
      await pending;
      expect(completed).toHaveBeenCalledExactlyOnceWith(region.firstElementChild);
    } finally {
      region.remove();
      vi.restoreAllMocks();
    }
  },
);
