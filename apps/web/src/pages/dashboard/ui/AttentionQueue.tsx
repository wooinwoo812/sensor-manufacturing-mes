import {
  ChevronRight,
  ClipboardList,
  PackageSearch,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import type { DashboardAttentionItem } from "@/entities/dashboard";
import { Badge, type BadgeTone } from "@/shared/ui";

interface AttentionQueueProps {
  items: DashboardAttentionItem[];
  /** 항목을 누르면 해당 대상이 있는 목록으로 이동한다. 대시보드가 막다른 화면이면 안 된다. */
  onOpen?: ((item: DashboardAttentionItem) => void) | undefined;
}

interface ItemVisual {
  icon: LucideIcon;
  iconClassName: string;
}

const visualByStatus: Record<string, ItemVisual> = {
  차단: {
    icon: PackageSearch,
    iconClassName: "bg-danger-soft text-danger-strong",
  },
  "검사 대기": {
    icon: ScanSearch,
    iconClassName: "bg-warning-soft text-warning-strong",
  },
  "납기 임박": {
    icon: ClipboardList,
    iconClassName: "bg-warning-soft text-warning-strong",
  },
};

const fallbackVisual: ItemVisual = {
  icon: ClipboardList,
  iconClassName: "bg-surface-subtle text-text-muted",
};

export function AttentionQueue({ items, onOpen }: AttentionQueueProps) {
  if (items.length === 0) {
    return (
      <p
        className="flex h-full items-center justify-center py-8 text-sm text-text-muted"
        role="status"
      >
        현재 조치가 필요한 항목이 없습니다.
      </p>
    );
  }

  return (
    <div
      className="grid h-full divide-y divide-border"
      style={{ gridTemplateRows: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ code, context, reason, status, tone }) => {
        const visual = visualByStatus[status] ?? fallbackVisual;
        const Icon = visual.icon;
        return (
          <article
            className={`group flex h-full items-start gap-3 py-4 ${onOpen ? "cursor-pointer rounded-control transition-colors hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/40 motion-reduce:transition-none" : ""}`}
            key={`${status}-${code}`}
            onClick={
              onOpen
                ? () => onOpen({ code, context, reason, status, tone })
                : undefined
            }
            onKeyDown={
              onOpen
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen({ code, context, reason, status, tone });
                    }
                  }
                : undefined
            }
            role={onOpen ? "link" : undefined}
            tabIndex={onOpen ? 0 : undefined}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-md ${visual.iconClassName}`}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold tabular-nums text-text-strong">
                  {code}
                </p>
                <Badge tone={tone satisfies BadgeTone}>{status}</Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-text">{reason}</p>
              <p className="mt-1 text-xs text-text-muted">{context}</p>
            </div>
            {onOpen ? (
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-text-subtle"
                aria-hidden="true"
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
