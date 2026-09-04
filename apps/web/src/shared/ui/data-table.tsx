import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<Row> {
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyMessage: string;
  /** 조건이 바뀌어 다시 조회하는 동안 이전 결과를 흐리게 유지한다(스켈레톤으로 교체하면 표가 깜빡인다). */
  busy?: boolean;
}

export function DataTable<Row>({ busy = false, caption, columns, emptyMessage, getRowKey, rows }: DataTableProps<Row>) {
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
                  className="whitespace-nowrap border-b border-border-strong px-3 py-2 font-medium first:pl-4 last:pr-4"
                  key={column.key}
                  scope="col"
                  style={{ textAlign: column.align ?? "left" }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr className="transition-colors hover:bg-surface-subtle focus-within:bg-accent-soft motion-reduce:transition-none" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className="whitespace-nowrap px-3 py-2.5 text-text tabular-nums first:pl-4 last:pr-4" key={column.key} style={{ textAlign: column.align ?? "left" }}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-text-muted" colSpan={columns.length}>
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
