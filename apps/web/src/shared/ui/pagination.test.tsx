import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./pagination";

it("한 페이지여도 건수와 현재 페이지 및 비활성 이동 버튼을 유지한다", () => {
  render(
    <Pagination
      label="목록 페이지"
      currentPage={1}
      totalPages={1}
      totalItems={9}
      onPageChange={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("navigation", { name: "목록 페이지" }),
  ).toHaveTextContent("총 9건");
  const region = screen.getByRole("navigation", { name: "목록 페이지" });
  expect(region).toHaveAttribute("data-tour", "pagination");
  expect(region).toHaveAttribute("data-tour-region");
  expect(screen.getByText(/1–9건/)).toBeInTheDocument();
  expect(screen.getByText("1 / 1 페이지")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1페이지" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const name of ["첫 페이지", "이전", "다음", "마지막 페이지"])
    expect(screen.getByRole("button", { name })).toBeDisabled();
});

it("번호와 이전·다음·처음·마지막은 유효한 서버 페이지로 이동한다", () => {
  const change = vi.fn();
  render(
    <Pagination
      label="목록 페이지"
      currentPage={4}
      totalPages={10}
      totalItems={193}
      onPageChange={change}
    />,
  );
  for (const [name, page] of [
    ["2페이지", 2],
    ["이전", 3],
    ["다음", 5],
    ["첫 페이지", 1],
    ["마지막 페이지", 10],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name }));
    expect(change).toHaveBeenLastCalledWith(page);
  }
  change.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "4페이지" }));
  expect(change).not.toHaveBeenCalled();
});

it("많은 페이지도 번호 창을 다섯 개로 제한하고 마지막 페이지 범위를 계산한다", () => {
  render(
    <Pagination
      label="목록 페이지"
      currentPage={1000}
      totalPages={1000}
      totalItems={19983}
      pageSize={20}
      onPageChange={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("button", { name: /^\d+페이지$/ })).toHaveLength(
    5,
  );
  expect(screen.getByRole("button", { name: "1000페이지" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("navigation")).toHaveTextContent("19,981–19,983건");
  expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
});

it("조회 중에는 기존 페이지 표시를 유지하며 모든 이동을 막는다", () => {
  const change = vi.fn();
  render(
    <Pagination
      busy
      label="목록 페이지"
      currentPage={2}
      totalPages={3}
      totalItems={43}
      pageSize={20}
      onPageChange={change}
    />,
  );
  const nav = screen.getByRole("navigation");
  expect(nav).toHaveAttribute("aria-busy", "true");
  expect(nav).toHaveTextContent("21–40건");
  for (const button of within(nav).getAllByRole("button")) {
    expect(button).toBeDisabled();
    fireEvent.click(button);
  }
  expect(change).not.toHaveBeenCalled();
});

it("빈 전체 건수는 음수나 1–0 범위를 표시하지 않는다", () => {
  render(
    <Pagination
      label="목록 페이지"
      currentPage={1}
      totalPages={0}
      totalItems={0}
      onPageChange={vi.fn()}
    />,
  );
  expect(screen.getByRole("navigation")).toHaveTextContent("0–0건");
  expect(screen.getByRole("button", { name: "1페이지" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("표시 건수 선택은 페이지 이동과 별도의 콜백으로 전달한다", async () => {
  const size = vi.fn(),
    page = vi.fn(),
    user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <Pagination
      label="목록 페이지"
      currentPage={1}
      totalPages={5}
      totalItems={43}
      onPageChange={page}
      onPageSizeChange={size}
    />,
  );
  const select = screen.getByRole("combobox", { name: "페이지당 표시 건수" });
  expect(select).toHaveTextContent("10건씩 보기");
  await user.click(select);
  await user.click(screen.getByRole("option", { name: "50건씩 보기" }));
  expect(size).toHaveBeenCalledExactlyOnceWith(50);
  expect(page).not.toHaveBeenCalled();
});
it("범위를 벗어난 URL은 없는 표시 구간을 만들지 않고 첫 페이지로 복구할 수 있다", () => {
  const change = vi.fn();
  render(
    <Pagination
      label="목록 페이지"
      currentPage={9}
      totalPages={1}
      totalItems={2}
      onPageChange={change}
    />,
  );
  expect(screen.getByText("페이지를 선택해 주세요")).toBeInTheDocument();
  expect(screen.getByRole("navigation")).toHaveTextContent("0–0건 표시");
  fireEvent.click(screen.getByRole("button", { name: "첫 페이지" }));
  expect(change).toHaveBeenCalledWith(1);
});
