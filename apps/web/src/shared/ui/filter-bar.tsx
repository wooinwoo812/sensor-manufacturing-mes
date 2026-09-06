import type { ReactNode } from "react";
import { LoaderCircle, RotateCcw, Search } from "lucide-react";
import { Button } from "./button";

interface FilterBarProps {
  children: ReactNode;
  resultLabel: string;
  actions?: ReactNode;
  onSearch?: () => void;
  onReset?: () => void;
  busy?: boolean;
  hasPendingChanges?: boolean;
}

/** Explicit query actions stay visible; editing conditions never shifts the result table. */
export function FilterBar({
  actions,
  children,
  resultLabel,
  onSearch,
  onReset,
  busy = false,
  hasPendingChanges = false,
}: FilterBarProps) {
  return (
    <section
      data-tour="filters"
      aria-label="조회 조건"
      className="overflow-hidden rounded-panel border border-border bg-surface"
    >
      <form
        aria-label="목록 조회"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) onSearch?.();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          if (event.nativeEvent.isComposing || event.keyCode === 229) {
            event.preventDefault();
            return;
          }
          if (
            onSearch &&
            !event.defaultPrevented &&
            event.target instanceof HTMLInputElement
          ) {
            event.preventDefault();
            if (!busy) event.currentTarget.requestSubmit();
          }
        }}
        className="flex flex-col gap-3 p-4 xl:flex-row xl:items-end"
      >
        <div className="grid min-w-0 flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          {children}
        </div>
        {onSearch || onReset || actions ? (
          <div className="flex shrink-0 items-center justify-end gap-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            {onSearch ? (
              <Button type="submit" disabled={busy} aria-label="조회">
                {busy ? (
                  <LoaderCircle
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Search className="size-4" aria-hidden="true" />
                )}
                조회
              </Button>
            ) : null}
            {onReset ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={onReset}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                조건 초기화
              </Button>
            ) : null}
            {actions}
          </div>
        ) : null}
      </form>
      <div
        className="flex flex-col gap-x-4 border-t border-border px-4 py-2 text-sm leading-5 text-text-muted sm:flex-row sm:items-center sm:justify-between"
        role="status"
      >
        <p className="min-h-10 sm:min-h-5">{resultLabel}</p>
        {onSearch ? (
          <p className="min-h-5 shrink-0 sm:w-56 sm:text-right">
            {busy
              ? "조회 중입니다…"
              : hasPendingChanges
                ? "조건 변경됨 · 조회해 주세요."
                : "조회 또는 Enter로 적용합니다."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
