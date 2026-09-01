import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

const metrics = [
  {
    detail: "오늘 신규 3건",
    icon: ClipboardList,
    iconClassName: "bg-accent-soft text-accent-strong",
    itemClassName: "border-b sm:border-e xl:border-b-0",
    label: "진행 중 작업지시",
    unit: "건",
    value: "12",
    valueClassName: "text-accent-strong",
  },
  {
    detail: "공정 진행 31 LOT",
    icon: Boxes,
    iconClassName: "bg-surface-subtle text-text-muted",
    itemClassName: "border-b xl:border-e xl:border-b-0",
    label: "생산 LOT",
    unit: "LOT",
    value: "48",
    valueClassName: "text-text-strong",
  },
  {
    detail: "최종검사 대기 2건",
    icon: ClipboardCheck,
    iconClassName: "bg-warning-soft text-warning-strong",
    itemClassName: "border-b sm:border-b-0 sm:border-e xl:border-e",
    label: "검사 대기",
    unit: "건",
    value: "7",
    valueClassName: "text-warning-strong",
  },
  {
    detail: "처분 결정이 필요한 대상",
    icon: ShieldAlert,
    iconClassName: "bg-danger-soft text-danger-strong",
    itemClassName: "",
    label: "격리 대상",
    unit: "LOT",
    value: "2",
    valueClassName: "text-danger-strong",
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
}>;

export function OperationsSummary() {
  return (
    <Card className="gap-0 overflow-hidden border-border-strong py-0">
      <CardHeader className="border-b bg-surface-subtle/50 px-5 py-4 sm:px-6">
        <CardTitle>
          <h3>오늘의 운영 현황</h3>
        </CardTitle>
        <CardDescription>
          현재 생산·검사·품질 상태를 업무 단위로 분리해 표시합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(
            ({
              detail,
              icon: Icon,
              iconClassName,
              itemClassName,
              label,
              unit,
              value,
              valueClassName,
            }) => (
              <div
                className={`border-border p-5 ${itemClassName}`}
                key={label}
              >
                <dt className="flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
                  <span>{label}</span>
                  <span
                    className={`grid size-8 place-items-center rounded-md ${iconClassName}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </dt>
                <dd className="mt-3 flex items-baseline gap-1">
                  <strong
                    className={`font-mono text-2xl font-bold tracking-tight ${valueClassName}`}
                  >
                    {value}
                  </strong>
                  <span className="text-xs font-medium text-text-muted">
                    {unit}
                  </span>
                </dd>
                <dd className="mt-1 text-xs text-text-muted">{detail}</dd>
              </div>
            ),
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
