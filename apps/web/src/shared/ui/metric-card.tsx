import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  emphasis?: "neutral" | "warning" | "danger";
}

export function MetricCard({ emphasis = "neutral", helper, icon: Icon, label, value }: MetricCardProps) {
  const iconTone = {
    neutral: "bg-accent-soft text-accent-strong",
    warning: "bg-warning-soft text-warning-strong",
    danger: "bg-danger-soft text-danger-strong",
  }[emphasis];

  return (
    <article className="rounded-panel border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-text-muted">{label}</span>
          <strong className="mt-3 block text-3xl font-semibold leading-none tracking-tight text-text-strong tabular-nums">{value}</strong>
        </div>
        <span className={`grid size-8 place-items-center rounded-control ${iconTone}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">{helper}</p>
    </article>
  );
}
