import {
  ArrowDown,
  ChevronUp,
  ChevronsUp,
  Minus,
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  Info,
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
  neutral: "border-transparent bg-surface-subtle text-text-muted",
  info: "border-transparent bg-accent-soft text-accent-strong",
  success: "border-transparent bg-success-soft text-success-strong",
  warning: "border-transparent bg-warning-soft text-warning-strong",
  danger: "border-transparent bg-danger-soft text-danger-strong",
};

const defaultIcon: Record<BadgeTone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: Check,
  warning: Clock3,
  danger: AlertTriangle,
};

export function Badge({
  children,
  className,
  icon,
  tone = "neutral",
}: BadgeProps) {
  const Icon = icon ?? defaultIcon[tone];

  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-0 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium leading-none",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: "low" | "normal" | "high" | "critical";
}) {
  const config = {
    low: { label: "낮음", tone: "neutral" },
    normal: { label: "보통", tone: "neutral" },
    high: { label: "높음", tone: "warning" },
    critical: { label: "긴급", tone: "danger" },
  } as const;

  const priorityColors = {
    neutral: "text-text-muted",
    warning: "text-warning-strong",
    danger: "text-danger-strong",
  };
  const Icon = {
    low: ArrowDown,
    normal: Minus,
    high: ChevronUp,
    critical: ChevronsUp,
  }[priority];
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap text-sm font-medium leading-5",
        priorityColors[config[priority].tone],
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{config[priority].label}</span>
    </span>
  );
}
