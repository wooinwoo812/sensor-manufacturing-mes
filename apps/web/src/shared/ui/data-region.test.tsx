import { render, screen } from "@testing-library/react";
import { DataRegion } from "./data-region";
import { TableSkeleton } from "./data-table";
beforeEach(() => {
  document.cookie = "sidebar_state=true; path=/";
  window.__MES_DATA_LAYOUT__ = {
    version: 2,
    href: location.pathname + location.search,
    width: innerWidth,
    viewportHeight: innerHeight,
    sidebar: "expanded",
    height: 1200,
    scrollY: 0,
    regions: [{ name: "table", height: 700 }],
  };
});
afterEach(() => {
  window.__MES_DATA_LAYOUT__ = null;
});
test("실측 높이는 데이터 영역에만 적용하고 제목·조건은 실제 요소로 둔다", () => {
  const view = (loading: boolean) => (
    <main>
      <header>
        <h1>작업지시</h1>
      </header>
      <form>
        <input aria-label="검색 조건" />
        <button>조회</button>
      </form>
      <DataRegion name="table" loading={loading}>
        {loading ? <span>조회 중</span> : <p>결과</p>}
      </DataRegion>
    </main>
  );
  const { container, rerender } = render(view(true));
  const title = screen.getByRole("heading"),
    input = screen.getByRole("textbox");
  expect(title.closest("[data-loading-placeholder]")).toBeNull();
  expect(input.closest("[data-loading-placeholder]")).toBeNull();
  expect(container.querySelector('[data-loading-region="table"]')).toHaveStyle({
    height: "700px",
  });
  expect(container.querySelector("[inert]")).toBeNull();
  rerender(view(false));
  expect(screen.getByRole("heading")).toBe(title);
  expect(screen.getByRole("textbox")).toBe(input);
  expect(
    (container.querySelector('[data-loading-region="table"]') as HTMLElement)
      .style.height,
  ).toBe("");
});
test.each(["path", "viewport", "sidebar"])(
  "%s가 다르면 이전 높이를 사용하지 않는다",
  (reason) => {
    const layout = window.__MES_DATA_LAYOUT__!;
    if (reason === "path") layout.href = "/different";
    if (reason === "viewport") layout.width = 999;
    if (reason === "sidebar") layout.sidebar = "collapsed";
    const { container } = render(
      <DataRegion name="table" loading>
        조회 중
      </DataRegion>,
    );
    expect(container.firstChild).not.toHaveAttribute("style");
  },
);
test("표만 실측 높이를 사용하며 장식용 회색 행은 만들지 않는다", () => {
  render(<TableSkeleton label="작업지시 조회 중" />);
  const result = screen.getByRole("status");
  expect(result).toHaveStyle({ height: "700px" });
  expect(result.querySelectorAll(".bg-border, .animate-pulse")).toHaveLength(0);
});
