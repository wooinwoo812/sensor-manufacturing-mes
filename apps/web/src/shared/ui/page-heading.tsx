import type { ReactNode } from "react";
import { cn } from "@/shared/lib";

interface PageHeadingProps {
  className?: string;
  description: string;
  meta?: ReactNode;
  title: string;
}

export function PageHeading({
  className,
  description,
  meta,
  title,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "mb-6 border-b border-border-strong pb-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className="mt-1 h-6 w-0.5 shrink-0 rounded-full bg-primary"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-text-strong">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
              {description}
            </p>
          </div>
        </div>
        {meta ? (
          <div className="shrink-0 text-xs text-text-muted">{meta}</div>
        ) : null}
      </div>
    </header>
  );
}
