import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./filter-bar";

it("조회와 Enter는 동일한 제출이며 초기화는 별도 동작이다", async () => {
  const onSearch = vi.fn(),
    onReset = vi.fn(),
    user = userEvent.setup();
  render(
    <FilterBar resultLabel="총 2건" onSearch={onSearch} onReset={onReset}>
      <input aria-label="검색" />
    </FilterBar>,
  );
  await user.type(screen.getByRole("textbox"), "abc");
  expect(onSearch).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "조회" }));
  expect(onSearch).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("textbox"));
  await user.keyboard("{Enter}");
  expect(onSearch).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole("button", { name: "조건 초기화" }));
  expect(onReset).toHaveBeenCalledOnce();
  expect(onSearch).toHaveBeenCalledTimes(2);
});
it("입력란 Enter는 기본 브라우저 제출에 의존하지 않고 한 번 조회한다", () => {
  const onSearch = vi.fn();
  render(
    <FilterBar resultLabel="총 2건" onSearch={onSearch}>
      <input aria-label="검색" />
    </FilterBar>,
  );
  expect(fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })).toBe(
    false,
  );
  expect(onSearch).toHaveBeenCalledOnce();
});
it("한글 조합 확정 Enter는 조회로 처리하지 않는다", () => {
  const onSearch = vi.fn();
  render(
    <FilterBar resultLabel="총 2건" onSearch={onSearch}>
      <input aria-label="검색" />
    </FilterBar>,
  );
  expect(
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      isComposing: true,
    }),
  ).toBe(false);
  expect(onSearch).not.toHaveBeenCalled();
});
it("조회 중에도 버튼과 이전 결과를 유지하고 중복 제출을 막는다", () => {
  const onSearch = vi.fn();
  render(
    <FilterBar busy resultLabel="총 2건" onSearch={onSearch} onReset={vi.fn()}>
      <input aria-label="검색" />
    </FilterBar>,
  );
  expect(screen.getByRole("button", { name: "조회" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "조건 초기화" })).toBeDisabled();
  expect(screen.getByText("총 2건")).toBeInTheDocument();
  fireEvent.submit(screen.getByRole("form", { name: "목록 조회" }));
  expect(onSearch).not.toHaveBeenCalled();
});
