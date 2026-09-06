import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { DashboardMetricSummary } from "@/entities/dashboard";
import { Panel } from "@/shared/ui";

interface OperationsSummaryProps {
  metrics: DashboardMetricSummary;
}

export function OperationsSummary({ metrics }: OperationsSummaryProps) {
  const items = [
    {
      detail: `전체 상태 중 차단 ${metrics.workOrders.blocked}건`,
      icon: ClipboardList,
      iconClassName: "bg-accent-soft text-accent-strong",
      itemClassName: "border-b sm:border-e xl:border-b-0",
      label: "진행 중 작업지시",
      unit: "건",
      value: metrics.workOrders.inProgress.toLocaleString("ko-KR"),
      valueClassName: "text-text-strong",
      detailClassName:
        metrics.workOrders.blocked > 0
          ? "text-danger-strong"
          : "text-text-muted",
    },
    {
      detail: `공정 진행 ${metrics.productionLots.inProgress} LOT`,
      icon: Boxes,
      iconClassName: "bg-surface-subtle text-text-muted",
      itemClassName: "border-b xl:border-e xl:border-b-0",
      label: "생산 LOT",
      unit: "LOT",
      value: metrics.productionLots.distinct.toLocaleString("ko-KR"),
      valueClassName: "text-text-strong",
      detailClassName: "text-text-muted",
    },
    {
      detail: `별도 보류 판정 ${metrics.inspections.hold}건`,
      icon: ClipboardCheck,
      iconClassName: "bg-warning-soft text-warning-strong",
      itemClassName: "border-b sm:border-b-0 sm:border-e xl:border-e",
      label: "검사 대기",
      unit: "건",
      value: metrics.inspections.pending.toLocaleString("ko-KR"),
      valueClassName: "text-text-strong",
      detailClassName:
        metrics.inspections.hold > 0
          ? "text-warning-strong"
          : "text-text-muted",
    },
    {
      detail: `별도 가용 재고 없음 ${metrics.materialLots.shortage} LOT`,
      icon: ShieldAlert,
      iconClassName: "bg-danger-soft text-danger-strong",
      itemClassName: "",
      label: "격리 자재",
      unit: "LOT",
      value: (
        metrics.materialLots.quarantined
      ).toLocaleString("ko-KR"),
      valueClassName: "text-text-strong",
      detailClassName:
        metrics.materialLots.quarantined > 0
          ? "text-danger-strong"
          : "text-text-muted",
    },
  ] satisfies ReadonlyArray<{
    detail: string;
    icon: LucideIcon;
    iconClassName: string;
    itemClassName: string;
    label: string;
    unit: string;
    value: string;
    valueClassName: string;
    detailClassName: string;
  }>;

  return (
    <Panel
      title="오늘의 운영 현황"
      tourAnchor="dashboard-operations"
      headingLevel="h3"
      bodyClassName="p-0"
    >
      <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
        {items.map(
          ({
            detail,
            detailClassName,
            icon: Icon,
            iconClassName,
            itemClassName,
            label,
            unit,
            value,
            valueClassName,
          }) => (
            <div className={`border-border p-5 ${itemClassName}`} key={label}>
              <dt className="flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
                <span>{label}</span>
                <span
                  className={`grid size-8 place-items-center rounded-md ${iconClassName}`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
              </dt>
              <dd className="mt-3 flex items-baseline gap-2">
                <strong
                  className={`text-3xl font-semibold tracking-tight tabular-nums ${valueClassName}`}
                >
                  {value}
                </strong>
                <span className="text-xs text-text-muted">{unit}</span>
              </dd>
              <dd className={`mt-2 text-xs leading-5 ${detailClassName}`}>
                {detail}
              </dd>
            </div>
          ),
        )}
      </dl>
    </Panel>
  );
}
