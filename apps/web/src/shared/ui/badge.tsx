import {
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  Info,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

interface BadgeProps {
  children: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border/70 bg-surface-subtle text-text-muted",
  info: "border-accent/60 bg-accent-soft text-accent-strong",
  success: "border-success-border/60 bg-success-soft text-success-strong",
  warning: "border-warning-border/60 bg-warning-soft text-warning-strong",
  danger: "border-danger-border/60 bg-danger-soft text-danger-strong",
};

const defaultIcon: Record<BadgeTone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: Check,
  warning: Clock3,
  danger: AlertTriangle,
};

export function Badge({ children, className, icon, tone = "neutral" }: BadgeProps) {
  const Icon = icon ?? defaultIcon[tone];

  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium leading-none", toneClasses[tone], className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "low" | "normal" | "high" | "critical" }) {
  const config = {
    low: { label: "낮음", tone: "neutral" },
    normal: { label: "보통", tone: "info" },
    high: { label: "높음", tone: "warning" },
    critical: { label: "긴급", tone: "danger" },
  } as const;

  // 우선순위는 점 + 텍스트로만 표시한다. 한 행에 상태·차단 사유·우선순위 배지가 나란히 놓이면
  // 세 번째 pill 은 정보가 아니라 소음이 된다. 긴급만 아이콘을 붙여 색 없이도 구분되게 한다.
  const dotTone: Record<BadgeTone, string> = {
    neutral: "bg-text-subtle",
    info: "bg-accent-strong",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-text">
      {priority === "critical" ? (
        <ShieldAlert className="size-3.5 text-danger-strong" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className={cn("size-2 rounded-full", dotTone[config[priority].tone])} />
      )}
      {config[priority].label}
    </span>
  );
}
