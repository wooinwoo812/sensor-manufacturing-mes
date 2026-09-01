import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  resultLabel: string;
  actions?: ReactNode;
}

export function FilterBar({ actions, children, resultLabel }: FilterBarProps) {
  return (
    <section className="rounded-panel border border-border bg-surface p-4" aria-label="조회 조건">
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-text-muted" role="status">
        {resultLabel}
      </p>
    </section>
  );
}
