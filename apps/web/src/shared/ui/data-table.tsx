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
    <div className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-subtle text-xs text-text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  className="border-b border-border px-4 py-3 font-semibold"
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
                  <td className="px-4 py-3 text-text" key={column.key} style={{ textAlign: column.align ?? "left" }}>
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
