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
  neutral: "border-border bg-surface-subtle text-text-muted",
  info: "border-accent/30 bg-accent-soft text-accent-strong",
  success: "border-success-border bg-success-soft text-success-strong",
  warning: "border-warning-border bg-warning-soft text-warning-strong",
  danger: "border-danger-border bg-danger-soft text-danger-strong",
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
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[0.6875rem] font-bold", toneClasses[tone], className)}>
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

  return (
    <Badge
      {...(priority === "critical" ? { icon: ShieldAlert } : {})}
      tone={config[priority].tone}
    >
      {config[priority].label}
    </Badge>
  );
}
