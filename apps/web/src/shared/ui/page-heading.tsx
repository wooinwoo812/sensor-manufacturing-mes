import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

interface PageHeadingProps {
  actions?: ReactNode;
  className?: string;
  description: string;
  meta?: ReactNode;
  title: string;
  /** 상세 화면 표식. "작업지시 상세"처럼 어떤 종류의 상세인지 제목 위에 작게 보여준다. */
  eyebrow?: string;
  /** 목록으로 돌아가는 링크. 상세 화면은 항상 같은 자리(제목 위)에 이 링크를 둔다. */
  back?: { label: string; onClick: () => void };
}

/**
 * 페이지 제목 영역.
 * - 목록 화면: 제목 + 설명 + 오른쪽 주요 행동
 * - 상세 화면: 돌아가기 링크 → 상세 표식(eyebrow) → 식별자 제목. 목록과 같은 자리에서
 *   시작하되 위 두 줄이 "여기는 상세"라는 신호를 준다. 왼쪽 막대·밑줄 같은 장식은 쓰지 않는다.
 */
export function PageHeading({
  actions,
  back,
  className,
  description,
  eyebrow,
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
      <div className="min-w-0">
        {back ? (
          <button
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-text-muted transition-colors hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 motion-reduce:transition-none"
            onClick={back.onClick}
            type="button"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {back.label}
          </button>
        ) : null}
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wide text-accent-strong">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold leading-8 tracking-tight text-text-strong">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta ? <div className="text-xs text-text-muted">{meta}</div> : null}
        {actions}
      </div>
    </header>
  );
}
