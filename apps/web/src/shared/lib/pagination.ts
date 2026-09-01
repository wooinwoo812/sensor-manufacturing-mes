export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  const rangeWithDots: Array<number | "..."> = [];

  if (totalPages <= maxVisiblePages) {
    for (let page = 1; page <= totalPages; page += 1) {
      rangeWithDots.push(page);
    }
    return rangeWithDots;
  }

  rangeWithDots.push(1);
  if (currentPage <= 3) {
    rangeWithDots.push(2, 3, 4, "...", totalPages);
  } else if (currentPage >= totalPages - 2) {
    rangeWithDots.push(
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    );
  } else {
    rangeWithDots.push(
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    );
  }

  return rangeWithDots;
}
