import { scrollToTourTarget, TOUR_SCROLL_DURATION } from "./tour-scroll";

let target: HTMLButtonElement;
let frames: FrameRequestCallback[];
beforeEach(() => {
  target = document.createElement("button");
  document.body.append(target);
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("scrollY", 0);
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
    2000,
  );
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
    top: 488,
    bottom: 528,
    left: 16,
    right: 316,
    width: 300,
    height: 40,
    x: 16,
    y: 488,
    toJSON: () => ({}),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: false,
  } as MediaQueryList);
  vi.spyOn(performance, "now").mockReturnValue(0);
  frames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
});
afterEach(() => {
  target.remove();
  document.querySelectorAll("[data-tour-card]").forEach((card) => card.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("reserves the measured desktop card height below a wide pagination target", async () => {
  vi.stubGlobal("innerWidth", 1366);
  vi.stubGlobal("innerHeight", 768);
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  const card = document.createElement("div");
  card.setAttribute("data-tour-card", "true");
  card.getBoundingClientRect = () => ({ width: 440, height: 396 }) as DOMRect;
  document.body.append(card);
  target.setAttribute("data-tour-region", "true");
  vi.mocked(target.getBoundingClientRect).mockReturnValue({
    top: 416, bottom: 500, height: 84, left: 200, right: 1320, width: 1120,
  } as DOMRect);
  await scrollToTourTarget(target, new AbortController().signal);
  const scroll = vi.mocked(window.scrollTo).mock.calls[0]![0] as ScrollToOptions;
  expect(scroll.top).toBeGreaterThan(0);
  expect(500 - scroll.top! + 16 + 396).toBeLessThanOrEqual(768 - 16);
});
it("목표까지 여러 프레임으로 감속하며 이동한 후에 완료한다", async () => {
  const completed = vi.fn();
  const pending = scrollToTourTarget(target, new AbortController().signal).then(
    completed,
  );
  expect(window.scrollTo).not.toHaveBeenCalled();
  frames.shift()!(80);
  const first = vi.mocked(window.scrollTo).mock.calls[0]![0] as ScrollToOptions;
  expect(first.top).toBeGreaterThan(0);
  expect(first.top).toBeLessThan(400);
  expect(completed).not.toHaveBeenCalled();
  frames.shift()!(160);
  const second = vi.mocked(window.scrollTo).mock
    .calls[1]![0] as ScrollToOptions;
  expect(second.top).toBeGreaterThan(first.top!);
  expect(second.top).toBeLessThan(400);
  frames.shift()!(TOUR_SCROLL_DURATION);
  await pending;
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 400,
    behavior: "instant",
  });
  expect(completed).toHaveBeenCalledOnce();
});
it("동작 줄이기 설정에서는 중간 프레임 없이 이동한다", async () => {
  vi.mocked(window.matchMedia).mockReturnValue({
    matches: true,
  } as MediaQueryList);
  await scrollToTourTarget(target, new AbortController().signal);
  expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({
    top: 400,
    behavior: "instant",
  });
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});
it("투어 종료 시 애니메이션을 취소하고 남은 프레임은 이동하지 않는다", async () => {
  const controller = new AbortController();
  const pending = scrollToTourTarget(target, controller.signal);
  controller.abort();
  await pending;
  frames.shift()!(160);
  expect(window.cancelAnimationFrame).toHaveBeenCalled();
  expect(window.scrollTo).not.toHaveBeenCalled();
});
it("표의 가로 화면 밖 대상도 같은 애니메이션 안에서 이동한다", async () => {
  vi.stubGlobal("innerWidth", 1440);
  const region = document.createElement("div");
  document.body.append(region);
  region.append(target);
  region.style.overflowX = "auto";
  vi.spyOn(region, "scrollWidth", "get").mockReturnValue(1000);
  vi.spyOn(region, "clientWidth", "get").mockReturnValue(300);
  vi.spyOn(region, "getBoundingClientRect").mockReturnValue({
    left: 16,
    right: 316,
    width: 300,
  } as DOMRect);
  vi.mocked(target.getBoundingClientRect).mockReturnValue({
    left: 616,
    right: 716,
    width: 100,
    top: 100,
    bottom: 140,
    height: 40,
  } as DOMRect);
  region.scrollTo = vi.fn();
  const pending = scrollToTourTarget(target, new AbortController().signal);
  frames.shift()!(160);
  expect(region.scrollTo).toHaveBeenCalledWith({
    left: 437.5,
    behavior: "instant",
  });
  frames.shift()!(TOUR_SCROLL_DURATION);
  await pending;
  expect(region.scrollTo).toHaveBeenLastCalledWith({
    left: 500,
    behavior: "instant",
  });
  expect(window.scrollTo).not.toHaveBeenCalled();
  region.remove();
});
it("데스크톱에서도 섹션 하단 입력을 안내 카드 위에 확보한다", async () => {
  vi.stubGlobal("innerWidth", 1440);
  vi.stubGlobal("innerHeight", 1000);
  const section = document.createElement("section");
  section.setAttribute("data-tour-region", "true");
  document.body.append(section);
  section.append(target);
  section.getBoundingClientRect = () =>
    ({
      top: 273,
      bottom: 649,
      height: 376,
      left: 200,
      right: 1397,
      width: 1197,
    }) as DOMRect;
  vi.mocked(target.getBoundingClientRect).mockReturnValue({
    top: 588,
    bottom: 628,
    height: 40,
    left: 305,
    right: 433,
    width: 128,
  } as DOMRect);
  const pending = scrollToTourTarget(target, new AbortController().signal);
  frames.shift()!(TOUR_SCROLL_DURATION);
  await pending;
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 97,
    behavior: "instant",
  });
  section.remove();
});
it("keeps the complete reservation section visible when a narrow card fits beside it", async () => {
  vi.stubGlobal("innerWidth", 1068);
  vi.stubGlobal("innerHeight", 900);
  const card = document.createElement("div");
  card.setAttribute("data-tour-card", "true");
  card.getBoundingClientRect = () => ({ height: 569 }) as DOMRect;
  document.body.append(card);
  const section = document.createElement("section");
  section.setAttribute("data-tour-region", "true");
  document.body.append(section);
  section.append(target);
  section.getBoundingClientRect = () => ({
    left: 280, right: 1034, top: 104, bottom: 595, width: 754, height: 491,
  }) as DOMRect;
  await scrollToTourTarget(target, new AbortController().signal);
  expect(window.scrollTo).not.toHaveBeenCalled();
  section.remove();
});

it("이미 보이는 데스크톱 대상은 추가 스크롤을 하지 않는다", async () => {
  vi.stubGlobal("innerWidth", 1440);
  await scrollToTourTarget(target, new AbortController().signal);
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(window.requestAnimationFrame).not.toHaveBeenCalled();
});
