import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  cn,
  DEFAULT_PAGE_SIZE,
  getPageSize,
  PAGE_SIZE_OPTIONS,
} from "@/shared/lib";
import { Select } from "./select";
import { Button } from "./button";

interface PaginationProps {
  label: string;
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  busy?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/** Keep the table footer visible even for one page; pagination always uses the server total. */
export function Pagination({
  currentPage,
  label,
  onPageChange,
  onPageSizeChange,
  totalPages,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  busy = false,
}: PaginationProps) {
  const lastPage = Math.max(1, totalPages);
  const page = Math.max(1, currentPage);
  const windowPage = Math.min(lastPage, page);
  const start = Math.max(1, Math.min(windowPage - 2, lastPage - 4));
  const pages = Array.from(
    { length: Math.min(5, lastPage) },
    (_, i) => start + i,
  );
  const mobileStart = Math.max(1, Math.min(windowPage - 1, lastPage - 2));
  const hasItems =
    totalItems !== undefined && totalItems > (page - 1) * pageSize;
  const firstItem = hasItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = hasItems ? Math.min(page * pageSize, totalItems) : 0;
  const changePage = (next: number) => {
    if (!busy && next >= 1 && next <= lastPage && next !== page)
      onPageChange(next);
  };
  const controlClass =
    "size-11 min-h-11 shrink-0 px-0 font-medium sm:size-9 sm:min-h-9";

  return (
    <nav
      data-tour="pagination"
      data-tour-region
      aria-label={label}
      aria-busy={busy || undefined}
      className="@container px-3 py-3 sm:px-4"
    >
      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-2 @min-[900px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <p className="col-start-1 row-start-1 text-sm tabular-nums leading-5 text-text-muted">
          {totalItems !== undefined ? (
            <>
              <span className="block font-medium text-text">
                총 {totalItems.toLocaleString("ko-KR")}건
              </span>
              <span>
                {firstItem.toLocaleString("ko-KR")}–
                {lastItem.toLocaleString("ko-KR")}건 표시
              </span>
            </>
          ) : null}
        </p>
        <div
          data-pagination-controls="true"
          className="col-span-2 row-start-2 flex items-center justify-self-center gap-1 @min-[900px]:col-span-1 @min-[900px]:col-start-2 @min-[900px]:row-start-1"
        >
          <Button
            type="button"
            variant="ghost"
            className={cn(controlClass, "hidden sm:inline-flex")}
            disabled={busy || page <= 1}
            onClick={() => changePage(1)}
            aria-label="첫 페이지"
            title="첫 페이지"
          >
            <ChevronsLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={controlClass}
            disabled={busy || page <= 1}
            onClick={() => changePage(Math.min(lastPage, page - 1))}
            aria-label="이전"
            title="이전 페이지"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          {pages.map((number) => (
            <Button
              key={number}
              type="button"
              variant="ghost"
              className={cn(
                controlClass,
                "w-auto min-w-11 px-2 tabular-nums sm:w-auto sm:min-w-9",
                (number < mobileStart || number > mobileStart + 2) &&
                  "hidden sm:inline-flex",
                number === page &&
                  "border-border-strong bg-surface-subtle text-text-strong font-semibold",
              )}
              aria-label={`${number}페이지`}
              aria-current={number === page ? "page" : undefined}
              disabled={busy}
              onClick={() => changePage(number)}
            >
              {number}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className={controlClass}
            disabled={busy || page >= lastPage}
            onClick={() => changePage(page + 1)}
            aria-label="다음"
            title="다음 페이지"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(controlClass, "hidden sm:inline-flex")}
            disabled={busy || page >= lastPage}
            onClick={() => changePage(lastPage)}
            aria-label="마지막 페이지"
            title="마지막 페이지"
          >
            <ChevronsRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="col-start-2 row-start-1 grid min-w-0 justify-self-end justify-items-end gap-1 text-right @min-[900px]:col-start-3">
          {onPageSizeChange ? (
            <div className="w-32 [&_button]:h-11 sm:[&_button]:h-9">
              <Select
                label="페이지당 표시 건수"
                hideLabel
                disabled={busy}
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS.map((size) => ({
                  value: String(size),
                  label: size + "건씩 보기",
                }))}
                onValueChange={(value) => {
                  const size = getPageSize(value);
                  if (!busy && size !== pageSize) onPageSizeChange(size);
                }}
              />
            </div>
          ) : null}
          <p className="text-sm tabular-nums leading-5 text-text-muted">
            {page > lastPage
              ? "페이지를 선택해 주세요"
              : page + " / " + lastPage + " 페이지"}
          </p>
        </div>
      </div>
    </nav>
  );
}
