import {
  AlertOctagon,
  FileQuestion,
  LockKeyhole,
  RefreshCw,
  SearchX,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-control bg-border motion-reduce:animate-none", className)}
      aria-hidden="true"
    />
  );
}

interface StatePanelProps {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  headingLevel?: "h1" | "h2" | "h3";
  icon: typeof SearchX;
  role?: "status" | "alert";
  title: string;
  tone?: "neutral" | "warning" | "danger";
}

interface ScreenStateProps {
  action?: ReactNode;
  description?: string;
  headingLevel?: "h1" | "h2" | "h3";
  title?: string;
}

function StatePanel({
  action,
  description,
  eyebrow,
  headingLevel = "h3",
  icon: Icon,
  role = "status",
  title,
  tone = "neutral",
}: StatePanelProps) {
  const iconTone = {
    neutral: "bg-surface-subtle text-text-muted",
    warning: "bg-warning-soft text-warning-strong",
    danger: "bg-danger-soft text-danger-strong",
  }[tone];
  const Heading = headingLevel;
  const headingClassName =
    headingLevel === "h1" ? "text-xl sm:text-2xl" : "text-base";

  return (
    <section
      className="rounded-panel border border-border bg-surface px-6 py-8 text-center"
      role={role}
    >
      <span
        className={`mx-auto grid size-11 place-items-center rounded-lg ${iconTone}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-4 block text-xs font-semibold text-text-subtle">
        {eyebrow}
      </span>
      <Heading
        className={`mt-1 font-bold text-text-strong ${headingClassName}`}
      >
        {title}
      </Heading>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function EmptyState({
  action,
  description = "조회 조건을 초기화하거나 새 업무 대상을 등록해 주세요.",
  headingLevel = "h3",
  title = "조건에 맞는 결과가 없습니다",
}: ScreenStateProps) {
  return (
    <StatePanel
      action={action}
      description={description}
      eyebrow="조회 결과"
      headingLevel={headingLevel}
      icon={SearchX}
      title={title}
    />
  );
}

export function ErrorState({
  action,
  description = "요청 ID를 확인하고 안전하게 다시 시도해 주세요. 입력한 값은 유지됩니다.",
  headingLevel = "h3",
  title = "데이터를 불러오지 못했습니다",
}: ScreenStateProps) {
  return (
    <StatePanel
      action={action}
      description={description}
      eyebrow="요청 오류"
      headingLevel={headingLevel}
      icon={AlertOctagon}
      role="alert"
      title={title}
      tone="danger"
    />
  );
}

export function ForbiddenState({
  action,
  description = "필요한 권한과 현재 역할을 확인한 뒤 역할을 전환해 주세요.",
  headingLevel = "h3",
  title = "이 작업을 수행할 권한이 없습니다",
}: ScreenStateProps) {
  return (
    <StatePanel
      action={action}
      description={description}
      eyebrow="접근 권한"
      headingLevel={headingLevel}
      icon={LockKeyhole}
      role="alert"
      title={title}
      tone="warning"
    />
  );
}

export function ConflictState({
  action,
  description = "최신 값을 다시 불러온 뒤 내 입력과 비교해 명시적으로 재시도해 주세요.",
  headingLevel = "h3",
  title = "다른 사용자가 먼저 변경했습니다",
}: ScreenStateProps) {
  return (
    <StatePanel
      action={action}
      description={description}
      eyebrow="동시 수정"
      headingLevel={headingLevel}
      icon={RefreshCw}
      role="alert"
      title={title}
      tone="warning"
    />
  );
}

export function NotFoundState({
  action,
  description = "식별자가 변경되었거나 접근 가능한 범위에서 제거된 대상입니다.",
  headingLevel = "h3",
  title = "업무 대상을 찾을 수 없습니다",
}: ScreenStateProps) {
  return (
    <StatePanel
      action={action}
      description={description}
      eyebrow="대상 없음"
      headingLevel={headingLevel}
      icon={FileQuestion}
      title={title}
    />
  );
}
