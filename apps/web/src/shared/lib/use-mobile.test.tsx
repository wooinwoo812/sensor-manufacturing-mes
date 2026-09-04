import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

test("1024px 미만을 overlay navigation 구간으로 판정한다", () => {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", matchMedia);

  const { unmount } = renderHook(() => useIsMobile());

  expect(matchMedia).toHaveBeenCalledWith("(width < 64rem)");
  unmount();
  vi.unstubAllGlobals();
});
