import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

interface PanelProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: "h2" | "h3";
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
  /** Focus the heading while the tour highlights the whole related section. */
  tourAnchor?: string;
}

/**
 * 상세 화면의 구획 패널.
 *
 * 간격 규칙(한 곳에서만 정의):
 * - 헤더 padding 20/16px, 본문 padding 20px
 * - 제목 16px semibold, 설명 12px muted
 * - 패널 사이 간격은 Main 또는 ContentGrid의 24px gap이 담당한다.
 */
export function Panel({
  actions,
  ariaLabel,
  bodyClassName,
  children,
  className,
  description,
  headingLevel = "h2",
  title,
  tourAnchor,
}: PanelProps) {
  const Heading = headingLevel;

  return (
    <section
      data-tour-region="true"
      aria-label={ariaLabel}
      className={cn(
        "min-w-0 rounded-panel border border-border bg-surface",
        className,
      )}
    >
      <header
        data-tour={tourAnchor}
        className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div className="min-w-0">
          <Heading className="text-base font-semibold leading-6 text-text-strong">
            {title}
          </Heading>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  );
}
