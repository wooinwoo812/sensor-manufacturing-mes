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
}

/**
 * 상세 화면의 구획 패널.
 *
 * 간격 규칙(한 곳에서만 정의):
 * - 헤더 padding 20/14px, 본문 padding 20/16px
 * - 제목 14px semibold, 설명 12px muted (제목보다 한 단계 작게 두어 본문 데이터가 앞선다)
 * - 패널 사이 간격은 Main 의 gap-4 가 담당하므로 패널 자체에 margin 을 두지 않는다
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
}: PanelProps) {
  const Heading = headingLevel;

  return (
    <section aria-label={ariaLabel} className={cn("rounded-panel border border-border bg-surface", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <Heading className="text-[15px] font-semibold leading-6 text-text-strong">{title}</Heading>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-5 text-text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}
