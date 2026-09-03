import {
  ClipboardList,
  PackageSearch,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import type { DashboardAttentionItem } from "@/entities/dashboard";
import { Badge, type BadgeTone } from "@/shared/ui";

interface AttentionQueueProps {
  items: DashboardAttentionItem[];
}

interface ItemVisual {
  icon: LucideIcon;
  iconClassName: string;
  railClassName: string;
}

const visualByStatus: Record<string, ItemVisual> = {
  차단: {
    icon: PackageSearch,
    iconClassName: "bg-danger-soft text-danger-strong",
    railClassName: "border-danger",
  },
  "검사 대기": {
    icon: ScanSearch,
    iconClassName: "bg-warning-soft text-warning-strong",
    railClassName: "border-warning",
  },
  "납기 임박": {
    icon: ClipboardList,
    iconClassName: "bg-warning-soft text-warning-strong",
    railClassName: "border-warning",
  },
};

const fallbackVisual: ItemVisual = {
  icon: ClipboardList,
  iconClassName: "bg-surface-subtle text-text-muted",
  railClassName: "border-border",
};

export function AttentionQueue({ items }: AttentionQueueProps) {
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
    <div className="grid h-full" style={{ gridTemplateRows: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ code, context, reason, status, tone }) => {
        const visual = visualByStatus[status] ?? fallbackVisual;
        const Icon = visual.icon;
        return (
          <article
            className={`flex h-full gap-3 border-s-2 py-4 ps-3 ${visual.railClassName}`}
            key={`${status}-${code}`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-md ${visual.iconClassName}`}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-text-strong">
                  {code}
                </p>
                <Badge tone={tone satisfies BadgeTone}>{status}</Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-text">{reason}</p>
              <p className="mt-1 text-xs text-text-muted">{context}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
