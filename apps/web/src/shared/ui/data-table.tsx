import { ChevronRight } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "@/shared/lib";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
  /** 제품명·제목처럼 긴 텍스트 열만 줄바꿈을 허용한다. 식별자·수량·날짜·배지는 한 줄을 지킨다. */
  wrap?: boolean;
}

interface DataTableProps<Row> {
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyMessage: string;
  /** 조건이 바뀌어 다시 조회하는 동안 이전 결과를 흐리게 유지한다(스켈레톤으로 교체하면 표가 깜빡인다). */
  busy?: boolean;
  /**
   * 있으면 행 전체가 상세로 가는 입구가 된다. 식별자 글자만 눌러야 하는 표는
   * "무엇을 눌러야 하는지" 알 수 없었다. 행 hover 배경·오른쪽 chevron·cursor 로 갈 수 있음을 보인다.
   * 행 안의 버튼(판정, 완료 입력)은 자기 일을 하고 행 이동을 일으키지 않는다.
   */
  onRowClick?: ((row: Row) => void) | undefined;
  rowActionLabel?: string;
}

function isInsideControl(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return target.closest("button, a, input, select, [role='combobox']") !== null;
}

export function DataTable<Row>({
  busy = false,
  caption,
  columns,
  emptyMessage,
  getRowKey,
  onRowClick,
  rowActionLabel = "상세 보기",
  rows,
}: DataTableProps<Row>) {
  const clickable = onRowClick !== undefined;

  return (
    <div
      aria-busy={busy || undefined}
      className={cn(
        "overflow-hidden rounded-panel border border-border bg-surface transition-opacity duration-150 motion-reduce:transition-none",
        busy && "opacity-60",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm leading-5">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-xs text-text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    "whitespace-nowrap border-b border-border-strong px-3 py-2 font-medium first:pl-4 last:pr-4",
                    // 첫 열(식별자)은 가로 스크롤 중에도 보인다. 1024px 에서 표가 옆으로 밀려도 어느 행인지 잃지 않는다.
                    "first:sticky first:left-0 first:z-[1] first:bg-surface first:shadow-[inset_-1px_0_0_var(--color-border)]",
                  )}
                  key={column.key}
                  scope="col"
                  style={{ textAlign: column.align ?? "left" }}
                >
                  {column.header}
                </th>
              ))}
              {clickable ? (
                <th className="w-10 border-b border-border-strong pr-3" scope="col">
                  <span className="sr-only">{rowActionLabel}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                className={cn(
                  // 행 배경은 불투명해야 sticky 첫 열이 bg-inherit 로 같은 색을 받는다.
                  "group bg-surface transition-colors hover:bg-[color-mix(in_oklch,var(--color-surface-subtle)_100%,transparent)] focus-within:bg-[color-mix(in_oklch,var(--color-accent-soft)_40%,var(--color-surface))] motion-reduce:transition-none",
                  clickable &&
                    "cursor-pointer hover:bg-[color-mix(in_oklch,var(--color-accent-soft)_50%,var(--color-surface))] focus-visible:outline-none focus-visible:bg-[color-mix(in_oklch,var(--color-accent-soft)_60%,var(--color-surface))]",
                )}
                key={getRowKey(row)}
                onClick={
                  clickable
                    ? (event) => {
                        if (!isInsideControl(event)) {
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (event) => {
                        if ((event.key === "Enter" || event.key === " ") && !isInsideControl(event)) {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={clickable ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={cn(
                      "px-3 py-2.5 text-text tabular-nums first:pl-4 last:pr-4",
                      "first:sticky first:left-0 first:z-[1] first:bg-inherit first:shadow-[inset_-1px_0_0_var(--color-border)]",
                      column.wrap ? "min-w-40 whitespace-normal" : "whitespace-nowrap",
                    )}
                    key={column.key}
                    style={{ textAlign: column.align ?? "left" }}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {clickable ? (
                  <td className="w-10 pr-3 text-right">
                    <ChevronRight
                      aria-hidden="true"
                      className="inline-block size-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong motion-reduce:transition-none"
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-text-muted" colSpan={columns.length + (clickable ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  label: string;
  rows?: number;
}

/**
 * 첫 조회 스켈레톤. 실제 표와 같은 높이(헤더 + 행 8개 ≈ 480px)로 그려서
 * 데이터가 도착할 때 페이지가 위로 튀지 않게 한다.
 */
export function TableSkeleton({ label, rows = 8 }: TableSkeletonProps) {
  return (
    <div aria-label={label} className="overflow-hidden rounded-panel border border-border bg-surface" role="status">
      <div className="h-9 border-b border-border-strong" />
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex items-center gap-4 border-b border-border px-4 last:border-b-0" key={index} style={{ height: 52 }}>
          <span className="block h-3 w-24 animate-pulse rounded-full bg-border motion-reduce:animate-none" />
          <span className="block h-3 w-48 animate-pulse rounded-full bg-border motion-reduce:animate-none" />
          <span className="ms-auto block h-3 w-16 animate-pulse rounded-full bg-border motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
