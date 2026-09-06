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
it("지원 열의 방향을 알리고 재조회 중 중복 정렬을 막는다", () => {
  const change = vi.fn();
  const props = {
    caption: "목록",
    rows,
    columns: [{ ...columns[0]!, sortKey: "name" }],
    getRowKey: (row: (typeof rows)[number]) => row.id,
    emptyMessage: "없음",
    onSortChange: change,
  };
  const view = render(
    <DataTable {...props} sort={{ sort: "name", order: "asc" }} />,
  );
  expect(screen.getByRole("columnheader", { name: "제품" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  fireEvent.click(screen.getByRole("button", { name: "제품 내림차순 정렬" }));
  expect(change).toHaveBeenCalledWith({ sort: "name", order: "desc" });
  view.rerender(
    <DataTable {...props} busy sort={{ sort: "name", order: "desc" }} />,
  );
  expect(
    screen.getByRole("button", { name: "제품 오름차순 정렬" }),
  ).toBeDisabled();
  expect(screen.getByText("제품 A")).toBeInTheDocument();
});
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
  const view = render(<TableSkeleton label="조회 중" columns={columns} />);
  expect(view.container.querySelector("thead")).toHaveTextContent("제품");
  expect(view.container.querySelectorAll("tbody tr")).toHaveLength(10);
  view.rerender(<TableSkeleton label="조회 중" rows={20} columns={columns} />);
  expect(view.container.querySelectorAll("tbody tr")).toHaveLength(20);
  expect(view.container.querySelector(".animate-pulse")).toBeNull();
  expect(
    screen.getByRole("combobox", { name: "페이지당 표시 건수" }),
  ).toBeDisabled();
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
