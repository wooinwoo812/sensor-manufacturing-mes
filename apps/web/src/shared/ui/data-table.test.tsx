import { fireEvent, render, screen, within } from "@testing-library/react";
import { DataTable, TableSkeleton } from "./data-table";
const rows = [
  { id: "one", name: "제품 A" },
  { id: "two", name: "제품 B" },
];
const columns = [
  {
    key: "name",
    align: "left" as const,
    header: "제품",
    cell: (row: (typeof rows)[number]) => row.name,
  },
];
it("재조회 중 표의 투명도를 바꾸거나 이전 행을 제거하지 않는다", () => {
  const view = render(
    <DataTable
      caption="목록"
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      emptyMessage="없음"
    />,
  );
  const table = screen.getByRole("table");
  view.rerender(
    <DataTable
      busy
      caption="목록"
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      emptyMessage="없음"
    />,
  );
  expect(screen.getByRole("table")).toBe(table);
  expect(table.closest("[data-tour-region]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(table.closest("[data-tour-region]")).not.toHaveClass(
    "opacity-60",
    "transition-opacity",
  );
});
it("표 준비 영역은 기본 10건과 선택한 건수를 반영하고 점멸하지 않는다", () => {
  const view = render(<TableSkeleton label="조회 중" />);
  expect(
    screen.getByRole("status").querySelector('[style="height: 600px;"]'),
  ).not.toBeNull();
  view.rerender(<TableSkeleton label="조회 중" rows={20} />);
  expect(
    screen.getByRole("status").querySelector('[style="height: 1160px;"]'),
  ).not.toBeNull();
  expect(screen.getByRole("status").querySelector(".animate-pulse")).toBeNull();
});
it("순번은 페이지의 시작 번호부터 이어지며 식별자는 별도로 유지한다", () => {
  render(
    <DataTable
      caption="제품 목록"
      rows={rows}
      columns={columns}
      getRowKey={(r) => r.id}
      emptyMessage="없음"
      rowNumberStart={23}
    />,
  );
  expect(screen.getByRole("columnheader", { name: "순번" })).toHaveTextContent(
    "No",
  );
  const bodyRows = screen.getAllByRole("row").slice(1);
  expect(
    within(bodyRows[0]!)
      .getAllByRole("cell")
      .map((e) => e.textContent),
  ).toEqual(["23", "제품 A"]);
  expect(
    within(bodyRows[1]!)
      .getAllByRole("cell")
      .map((e) => e.textContent),
  ).toEqual(["22", "제품 B"]);
});
it("순번과 첫 식별 열이 각각 고정되고 셀 안의 행동은 행 이동과 분리된다", () => {
  const open = vi.fn(),
    action = vi.fn();
  render(
    <DataTable
      caption="목록"
      rows={rows}
      columns={[
        ...columns,
        {
          key: "action",
          align: "center",
          header: "행동",
          cell: () => <button onClick={action}>확인</button>,
        },
      ]}
      getRowKey={(r) => r.id}
      emptyMessage="없음"
      onRowClick={open}
    />,
  );
  const first = screen.getAllByRole("row")[1]!;
  expect(first.querySelectorAll("[data-sticky-column]")).toHaveLength(2);
  fireEvent.click(within(first).getByRole("cell", { name: "2" }));
  expect(open).toHaveBeenCalledWith(rows[0]);
  open.mockClear();
  fireEvent.click(within(first).getByRole("button"));
  expect(action).toHaveBeenCalledOnce();
  expect(open).not.toHaveBeenCalled();
});
it("빈 결과의 셀 폭은 순번과 상세 이동 열까지 포함한다", () => {
  render(
    <DataTable
      caption="목록"
      rows={[]}
      columns={columns}
      getRowKey={(r) => r.id}
      emptyMessage="없음"
      onRowClick={() => undefined}
    />,
  );
  expect(screen.getByRole("cell", { name: "없음" })).toHaveAttribute(
    "colspan",
    "3",
  );
});
