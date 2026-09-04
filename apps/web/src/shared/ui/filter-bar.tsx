import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  resultLabel: string;
  actions?: ReactNode;
}

export function FilterBar({ actions, children, resultLabel }: FilterBarProps) {
  return (
    <section className="rounded-panel border border-border bg-surface px-4 py-3" aria-label="조회 조건">
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      <p className="mt-2.5 border-t border-border pt-2.5 text-xs text-text-muted" role="status">
        {resultLabel}
      </p>
    </section>
  );
}
