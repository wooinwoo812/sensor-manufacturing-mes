import { Button } from "./button";

interface PaginationProps {
  label: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** 한 페이지뿐이면 아무것도 그리지 않는다. */
export function Pagination({ currentPage, label, onPageChange, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={label} className="flex items-center justify-end gap-2">
      <Button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        size="compact"
        variant="secondary"
      >
        이전
      </Button>
      <span className="text-xs tabular-nums text-text-muted">
        {currentPage} / {totalPages} 페이지
      </span>
      <Button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        size="compact"
        variant="secondary"
      >
        다음
      </Button>
    </nav>
  );
}
