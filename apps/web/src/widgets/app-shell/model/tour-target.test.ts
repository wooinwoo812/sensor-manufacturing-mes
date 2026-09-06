import { positionTourCard, waitForTourTarget } from "./tour-target";

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
