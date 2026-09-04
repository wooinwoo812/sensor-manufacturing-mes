import type { ReactNode } from "react";

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
}

export function DataTable<Row>({ caption, columns, emptyMessage, getRowKey, rows }: DataTableProps<Row>) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm leading-5">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-subtle text-xs text-text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  className="whitespace-nowrap border-b border-border px-3 py-2.5 font-semibold first:pl-4 last:pr-4"
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
