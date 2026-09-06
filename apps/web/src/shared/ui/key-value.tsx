import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

interface KeyValueGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const columnClasses: Record<NonNullable<KeyValueGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 xl:grid-cols-5",
};

/** 상세 요약 정의 목록. 가로 24px·세로 20px 간격을 소유한다. */
export function KeyValueGrid({ children, className, columns = 4 }: KeyValueGridProps) {
  return <dl className={cn("grid gap-x-6 gap-y-5", columnClasses[columns], className)}>{children}</dl>;
}

interface KeyValueProps {
  label: ReactNode;
  children: ReactNode;
  /** lg: 수량·날짜·비율 같은 핵심 수치, sm: 이름·코드 같은 보조 값 */
  size?: "lg" | "sm";
  strong?: boolean;
}

/**
 * 라벨 12px muted 아래에 값이 8px 간격으로 붙는다. 큰 수치는 18px semibold tabular-nums 로
 * 자릿수를 맞추고, 식별자·상태 badge 는 children 으로 그대로 넣는다.
 */
export function KeyValue({ children, label, size = "sm", strong = false }: KeyValueProps) {
  return (
    <div className="min-w-0 border-l-2 border-border pl-3">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-2 text-text-strong",
          size === "lg" ? "text-lg font-semibold tabular-nums" : "text-sm",
          size === "sm" && strong && "font-semibold",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
