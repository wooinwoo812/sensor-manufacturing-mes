import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowLeftRight,
  ChevronRight,
  LoaderCircle,
  SearchX,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn, loadingRegionHeight, type SortOrder } from "@/shared/lib";
import { Pagination } from "./pagination";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Explicit alignment is required; business lists follow frontend-table-rules.md. */
  align: "left" | "center" | "right";
  /** 제품명·제목처럼 긴 텍스트 열만 줄바꿈을 허용한다. 식별자·수량·날짜·배지는 한 줄을 지킨다. */
  wrap?: boolean;
  /** 최초 조회와 데이터 표시가 같은 열 너비를 사용한다. */
  width?: number;
  /** 전체 결과를 정렬하는 API 필드. 지정한 열만 정렬할 수 있다. */
  sortKey?: string;
}

interface DataTableProps<Row> {
  caption: string;
  /** Pagination belongs to the table but stays outside its horizontal scroll region. */
  footer?: ReactNode;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyMessage: string;
  /** 조건이 바뀌어 다시 조회하는 동안 이전 결과를 그대로 유지한다(스켈레톤으로 교체하면 표가 깜빡인다). */
  busy?: boolean;
  loading?: boolean;
  loadingRows?: number;
  loadingLabel?: string;
  sort?: { sort: string; order: SortOrder };
  onSortChange?: (next: { sort: string; order: SortOrder }) => void;
  /**
   * 있으면 행 전체가 상세로 가는 입구가 된다. 식별자 글자만 눌러야 하는 표는
   * "무엇을 눌러야 하는지" 알 수 없었다. 행 hover 배경·오른쪽 chevron·cursor 로 갈 수 있음을 보인다.
   * 행 안의 버튼(판정, 완료 입력)은 자기 일을 하고 행 이동을 일으키지 않는다.
   */
  onRowClick?: ((row: Row) => void) | undefined;
  rowActionLabel?: string;
  /** 내림차순 표시 순번의 시작값. 페이지 목록은 조회 결과 total - offset을 전달한다. */
  rowNumberStart?: number;
  showRowNumbers?: boolean;
  tourRecord?: string;
  getTourContext?: (row: Row) => string;
  isTourPreferred?: (row: Row) => boolean;
}

function isInsideControl(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return target.closest("button, a, input, select, [role='combobox']") !== null;
}

export function DataTable<Row>({
  busy = false,
  loading = false,
  loadingRows = 10,
  loadingLabel = "목록 조회 중",
  sort,
  onSortChange,
  caption,
  footer,
  columns,
  emptyMessage,
  getRowKey,
  onRowClick,
  rowActionLabel = "상세 보기",
  rowNumberStart,
  showRowNumbers = true,
  rows,
  tourRecord,
  getTourContext,
  isTourPreferred,
}: DataTableProps<Row>) {
  const clickable = onRowClick !== undefined;
  const widths = columns.map(
    (column) => column.width ?? (column.wrap ? 240 : 128),
  );
  const minimumWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    (showRowNumbers ? 64 : 0) +
    (clickable ? 40 : 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const region = scrollRef.current;
    if (!region || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setOverflows(region.clientWidth < minimumWidth),
    );
    observer.observe(region);
    return () => observer.disconnect();
  }, [minimumWidth]);

  return (
    <div
      data-tour-region="true"
      data-loading-region="table"
      aria-busy={busy || loading || undefined}
      data-loading-placeholder={loading || undefined}
      style={loading ? { height: loadingRegionHeight("table") } : undefined}
      className="overflow-hidden rounded-panel border border-border bg-surface"
    >
      <div
        data-tour="table-heading"
        className="relative flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5"
      >
        <span className="text-sm font-semibold text-text-strong">
          {caption}
        </span>
        <span
          className="flex min-w-28 items-center justify-end gap-2 text-sm text-text-muted"
          role="status"
          aria-live="polite"
        >
          <span
            className={cn(!overflows && "invisible")}
            title="표를 좌우로 스크롤할 수 있습니다"
          >
            <ArrowLeftRight className="inline size-3.5" aria-hidden="true" />{" "}
            <span className="hidden sm:inline">좌우로 이동</span>
          </span>
          <LoaderCircle
            className={cn(
              "size-4 shrink-0",
              busy || loading
                ? "animate-spin motion-reduce:animate-none"
                : "invisible",
            )}
            aria-hidden="true"
          />
          <span className="min-w-16 text-right">
            {loading ? (
              <>
                <span aria-hidden="true">조회 중</span>
                <span className="sr-only">{loadingLabel}</span>
              </>
            ) : busy ? (
              "갱신 중"
            ) : (
              `${rows.length.toLocaleString("ko-KR")}건 표시`
            )}
          </span>
        </span>
      </div>
      <div
        ref={scrollRef}
        aria-label={`${caption} 가로 스크롤 영역`}
        className="relative isolate overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        role="region"
        tabIndex={0}
      >
        <table
          aria-hidden={loading || undefined}
          style={{ minWidth: minimumWidth }}
          className="w-full table-fixed border-collapse text-sm leading-5 [&[data-tour-column-focus]_[data-sticky-column]]:static"
        >
          <caption className="sr-only left-0 top-0">{caption}</caption>
          <colgroup>
            {showRowNumbers ? <col style={{ width: 64 }} /> : null}
            {columns.map((column, index) => (
              <col key={column.key} style={{ width: widths[index] }} />
            ))}
            {clickable ? <col style={{ width: 40 }} /> : null}
          </colgroup>
          <thead className="bg-surface-subtle text-sm text-text-muted">
            <tr>
              {showRowNumbers ? (
                <th
                  scope="col"
                  data-sticky-column="true"
                  className="sticky left-0 z-[2] w-16 min-w-16 border-b border-border bg-surface-subtle px-3 py-2.5 text-center font-medium"
                  aria-label="순번"
                >
                  No
                </th>
              ) : null}
              {columns.map((column, columnIndex) => (
                <th
                  className={cn(
                    "whitespace-nowrap border-b border-border px-3 py-2.5 align-middle font-medium last:pr-4",
                    // 첫 열(식별자)은 가로 스크롤 중에도 보인다. 1024px 에서 표가 옆으로 밀려도 어느 행인지 잃지 않는다.
                    columnIndex === 0 && "sticky z-[1] bg-surface-subtle",
                  )}
                  key={column.key}
                  aria-label={column.header}
                  aria-sort={
                    column.sortKey && onSortChange
                      ? sort?.sort === column.sortKey
                        ? sort.order === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  data-sticky-column={columnIndex === 0 ? "true" : undefined}
                  data-tour={
                    tourRecord
                      ? `${tourRecord}-column-${column.key}`
                      : undefined
                  }
                  scope="col"
                  style={{
                    textAlign: column.align ?? "left",
                    left:
                      columnIndex === 0 ? (showRowNumbers ? 64 : 0) : undefined,
                  }}
                >
                  {column.sortKey && onSortChange ? (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex min-h-6 items-center gap-1 rounded-sm font-medium outline-offset-4 hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-wait",
                        sort?.sort === column.sortKey && "text-accent-strong",
                      )}
                      disabled={busy || loading}
                      aria-label={`${column.header} ${sort?.sort === column.sortKey && sort.order === "asc" ? "내림차순" : "오름차순"} 정렬`}
                      onClick={() =>
                        onSortChange({
                          sort: column.sortKey!,
                          order:
                            sort?.sort === column.sortKey &&
                            sort?.order === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      {column.header}
                      {sort?.sort === column.sortKey ? (
                        sort.order === "asc" ? (
                          <ArrowUp
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowDown
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        )
                      ) : (
                        <ArrowUpDown
                          className="size-3.5 shrink-0 text-text-subtle"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {clickable ? (
                <th
                  className="relative w-10 border-b border-border px-2 text-center"
                  scope="col"
                >
                  <span className="sr-only">{rowActionLabel}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                  <tr
                    key={rowIndex}
                    aria-hidden="true"
                    className="h-[60px] bg-surface"
                  >
                    {showRowNumbers ? (
                      <td className="px-3 py-2">
                        <span className="mx-auto block h-3 w-5 rounded bg-border" />
                      </td>
                    ) : null}
                    {columns.map((column, columnIndex) => (
                      <td key={column.key} className="px-3 py-2">
                        <span
                          className={cn(
                            "block h-3 rounded bg-border",
                            column.align === "center" && "mx-auto",
                            column.align === "right" && "ml-auto",
                          )}
                          style={{ width: `${rowIndex % 3 === 0 ? 65 : 80}%` }}
                        />
                        {column.wrap ? (
                          <span className="mt-2 block h-3 w-2/5 rounded bg-surface-subtle" />
                        ) : null}
                        {columnIndex === 0 ? (
                          <span className="sr-only">조회 중</span>
                        ) : null}
                      </td>
                    ))}
                    {clickable ? <td /> : null}
                  </tr>
                ))
              : null}
            {rows.map((row, rowIndex) => (
              <tr
                className={cn(
                  // 행 배경은 불투명해야 sticky 첫 열이 bg-inherit 로 같은 색을 받는다.
                  "group h-[60px] bg-surface transition-colors hover:bg-[color-mix(in_oklch,var(--color-surface-subtle)_100%,transparent)] focus-within:bg-[color-mix(in_oklch,var(--color-accent-soft)_40%,var(--color-surface))] motion-reduce:transition-none",
                  clickable &&
                    "cursor-pointer hover:bg-[color-mix(in_oklch,var(--color-accent-soft)_50%,var(--color-surface))] focus-visible:outline-none focus-visible:bg-[color-mix(in_oklch,var(--color-accent-soft)_60%,var(--color-surface))]",
                )}
                key={getRowKey(row)}
                data-tour={tourRecord ? `record-${tourRecord}` : undefined}
                data-tour-record-id={tourRecord ? getRowKey(row) : undefined}
                data-tour-context={getTourContext?.(row)}
                data-tour-preferred={
                  isTourPreferred?.(row) ? "true" : undefined
                }
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
                        if (
                          (event.key === "Enter" || event.key === " ") &&
                          !isInsideControl(event)
                        ) {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={clickable ? 0 : undefined}
              >
                {showRowNumbers ? (
                  <td
                    data-sticky-column="true"
                    className="sticky left-0 z-[2] w-16 min-w-16 bg-inherit px-3 py-2 text-center align-middle text-sm tabular-nums text-text-muted"
                  >
                    {(rowNumberStart ?? rows.length) - rowIndex}
                  </td>
                ) : null}
                {columns.map((column, columnIndex) => (
                  <td
                    className={cn(
                      "px-3 py-2 align-middle text-text tabular-nums last:pr-4",
                      columnIndex === 0 && "sticky z-[1] bg-inherit",
                      column.align === "center" && "[&>.flex]:justify-center",
                      column.wrap
                        ? "min-w-32 whitespace-normal [&_.rounded-full]:h-auto [&_.rounded-full]:min-h-6 [&_.rounded-full]:whitespace-normal [&_.rounded-full]:py-1 [&_.rounded-full]:leading-4 [&_svg]:shrink-0"
                        : "whitespace-nowrap",
                    )}
                    key={column.key}
                    data-sticky-column={columnIndex === 0 ? "true" : undefined}
                    style={{
                      textAlign: column.align ?? "left",
                      left:
                        columnIndex === 0
                          ? showRowNumbers
                            ? 64
                            : 0
                          : undefined,
                    }}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {clickable ? (
                  <td className="w-10 px-2 text-center">
                    <ChevronRight
                      aria-hidden="true"
                      className="inline-block size-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong motion-reduce:transition-none"
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-text-muted"
                  colSpan={
                    columns.length +
                    (showRowNumbers ? 1 : 0) +
                    (clickable ? 1 : 0)
                  }
                >
                  <SearchX
                    className="mx-auto mb-3 size-6 text-text-subtle"
                    aria-hidden="true"
                  />
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-border">{footer}</div> : null}
    </div>
  );
}

interface TableSkeletonProps<Row> {
  label: string;
  caption?: string;
  columns: DataTableColumn<Row>[];
  clickable?: boolean;
  rows?: number;
  sort?: { sort: string; order: SortOrder };
  onSortChange?: (next: { sort: string; order: SortOrder }) => void;
}

/**
 * 첫 조회 스켈레톤. 실제 열·60px 최소 행 높이·페이지네이션을 공유해서
 * 공간을 예약한다. 첫 방문은 추정치이며 새로고침은 이 표 영역의 직전 실측 높이를 사용한다.
 */
export function TableSkeleton<Row>({
  label,
  caption = label,
  columns,
  clickable = false,
  rows = 10,
  ...sorting
}: TableSkeletonProps<Row>) {
  return (
    <DataTable<Row>
      {...sorting}
      loading
      loadingRows={rows}
      loadingLabel={label}
      caption={caption}
      columns={columns}
      rows={[]}
      getRowKey={() => ""}
      emptyMessage=""
      onRowClick={clickable ? () => undefined : undefined}
      footer={
        <Pagination
          label="목록 페이지 탐색"
          currentPage={1}
          totalPages={1}
          pageSize={rows}
          loading
          busy
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      }
    />
  );
}
