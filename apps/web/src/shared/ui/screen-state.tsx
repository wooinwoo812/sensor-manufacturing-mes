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
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
  icon: typeof SearchX;
  role?: "status" | "alert";
}

function StatePanel({ action, description, eyebrow, icon: Icon, role = "status", title, tone = "neutral" }: StatePanelProps) {
  const iconTone = {
    neutral: "bg-surface-subtle text-text-muted",
    warning: "bg-warning-soft text-warning-strong",
    danger: "bg-danger-soft text-danger-strong",
  }[tone];

  return (
    <section className="rounded-panel border border-border bg-surface px-6 py-8 text-center shadow-control" role={role}>
      <span className={`mx-auto grid size-11 place-items-center rounded-full ${iconTone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-4 block font-mono text-[0.625rem] font-bold tracking-[0.14em] text-text-subtle">{eyebrow}</span>
      <h3 className="mt-1 text-base font-bold text-text-strong">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function EmptyState({ action }: { action?: ReactNode }) {
  return <StatePanel action={action} eyebrow="EMPTY" title="조건에 맞는 결과가 없습니다" description="조회 조건을 초기화하거나 새 업무 대상을 등록해 주세요." icon={SearchX} />;
}

export function ErrorState({ action }: { action?: ReactNode }) {
  return <StatePanel action={action} eyebrow="REQUEST ERROR" title="데이터를 불러오지 못했습니다" description="요청 ID를 확인하고 안전하게 다시 시도해 주세요. 입력한 값은 유지됩니다." icon={AlertOctagon} role="alert" tone="danger" />;
}

export function ForbiddenState({ action }: { action?: ReactNode }) {
  return <StatePanel action={action} eyebrow="PERMISSION" title="이 작업을 수행할 권한이 없습니다" description="필요한 권한과 현재 역할을 확인한 뒤 역할을 전환해 주세요." icon={LockKeyhole} role="alert" tone="warning" />;
}

export function ConflictState({ action }: { action?: ReactNode }) {
  return <StatePanel action={action} eyebrow="VERSION CONFLICT" title="다른 사용자가 먼저 변경했습니다" description="최신 값을 다시 불러온 뒤 내 입력과 비교해 명시적으로 재시도해 주세요." icon={RefreshCw} role="alert" tone="warning" />;
}

export function NotFoundState({ action }: { action?: ReactNode }) {
  return <StatePanel action={action} eyebrow="NOT FOUND" title="업무 대상을 찾을 수 없습니다" description="식별자가 변경되었거나 접근 가능한 범위에서 제거된 대상입니다." icon={FileQuestion} />;
}
