import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

/** Related content shares one responsive grid; pages choose structure, not spacing. */
export function ContentGrid({
  children,
  aside = false,
}: {
  children: ReactNode;
  aside?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-6",
        aside ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "xl:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

/** Status context beneath a detail heading. Never merge independent status axes. */
export function StatusStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-panel border border-border bg-surface px-5 py-3">
      {children}
    </div>
  );
}

export function FormFields({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 gap-5 sm:grid-cols-2">{children}</div>;
}

export function FormActions({
  children,
  tourAnchor,
}: {
  children: ReactNode;
  tourAnchor?: string;
}) {
  return (
    <div
      data-form-actions="true"
      data-tour={tourAnchor}
      className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4"
    >
      {children}
    </div>
  );
}

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-border bg-surface-subtle text-text-muted",
    warning: "border-warning-border bg-warning-soft text-warning-strong",
    danger: "border-danger-border bg-danger-soft text-danger-strong",
  };
  return (
    <div
      className={cn(
        "rounded-control border px-4 py-3 text-sm leading-6",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

interface TimelineItem {
  id: string;
  dateTime: string;
  timeLabel: string;
  title: ReactNode;
  description?: ReactNode;
}

export function Timeline({
  items,
  emptyMessage,
}: {
  items: TimelineItem[];
  emptyMessage: string;
}) {
  if (items.length === 0)
    return (
      <p className="py-4 text-sm text-text-muted" role="status">
        {emptyMessage}
      </p>
    );
  return (
    <ol className="grid gap-0">
      {items.map((item) => (
        <li
          key={item.id}
          className="relative border-l border-border pb-5 pl-5 last:border-transparent last:pb-0"
        >
          <span
            className="absolute -left-1 top-1.5 size-2 rounded-full border border-surface bg-primary"
            aria-hidden="true"
          />
          <time
            className="text-xs tabular-nums text-text-muted"
            dateTime={item.dateTime}
          >
            {item.timeLabel}
          </time>
          <div className="mt-1 text-sm font-medium text-text-strong">
            {item.title}
          </div>
          {item.description ? (
            <div className="mt-1 text-xs leading-5 text-text-muted">
              {item.description}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
