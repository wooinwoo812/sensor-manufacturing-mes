import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

interface PageHeadingProps {
  actions?: ReactNode;
  className?: string;
  description: string;
  meta?: ReactNode;
  title: string;
}

export function PageHeading({
  actions,
  className,
  description,
  meta,
  title,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      {/* 왼쪽 파란 막대와 밑줄은 2015년식 admin 템플릿 신호라 제거했다. 제목 크기와 Main 의 gap 만으로 구획한다. */}
      <>
        <div className="flex min-w-0 gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-text-strong">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-text-muted">
              {description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta ? <div className="text-xs text-text-muted">{meta}</div> : null}
          {actions}
        </div>
      </>
    </header>
  );
}
