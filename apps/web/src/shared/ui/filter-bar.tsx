import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  resultLabel: string;
  actions?: ReactNode;
}

/**
 * 조회 조건 툴바. 카드로 감싸지 않는다: 표 위에 상자가 하나 더 놓이면
 * 화면이 "상자 안의 상자"가 되고 필터가 데이터보다 무거워 보인다.
 * 결과 문구는 같은 행 오른쪽 끝에 두어 세로 공간을 쓰지 않는다.
 */
export function FilterBar({ actions, children, resultLabel }: FilterBarProps) {
  return (
    <section aria-label="조회 조건" className="flex flex-wrap items-end gap-3">
      {children}
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      <p className="ms-auto self-end pb-2.5 text-xs text-text-muted" role="status">
        {resultLabel}
      </p>
    </section>
  );
}
