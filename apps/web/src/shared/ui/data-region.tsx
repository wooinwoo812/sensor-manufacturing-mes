import type { HTMLAttributes, ReactNode } from "react";
import { cn, loadingRegionHeight } from "@/shared/lib";

/** Wrap only API-result content, never headings, navigation, filters, or static help. */
export function DataRegion({
  name,
  loading = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  name: string;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const height = loading ? loadingRegionHeight(name) : undefined;
  return (
    <div
      {...props}
      data-loading-region={name}
      data-loading-placeholder={loading ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(
        "grid min-w-0 gap-5",
        height && "overflow-hidden",
        className,
      )}
      style={height === undefined ? undefined : { height }}
    >
      {children}
    </div>
  );
}
