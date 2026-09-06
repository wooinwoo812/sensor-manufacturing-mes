import { render, screen, waitFor } from "@testing-library/react";
import { ContentReadiness } from "./ContentReadiness";
test("안내 준비를 기다려도 본문·제목·검색조건을 가리지 않는다", async () => {
  const onReady = vi.fn();
  const view = (loading: boolean) => (
    <ContentReadiness onReady={onReady}>
      <main>
        <h1>작업지시</h1>
        <input aria-label="검색" />
        {loading ? <div data-loading-placeholder /> : <p>결과</p>}
      </main>
    </ContentReadiness>
  );
  const { container, rerender } = render(view(true));
  const heading = screen.getByRole("heading"),
    input = screen.getByRole("textbox");
  expect(container.querySelector("[inert], [aria-hidden=true]")).toBeNull();
  expect(onReady).not.toHaveBeenCalled();
  rerender(view(false));
  await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("heading")).toBe(heading);
  expect(screen.getByRole("textbox")).toBe(input);
  rerender(view(true));
  expect(container.querySelector("[inert], [aria-hidden=true]")).toBeNull();
});
