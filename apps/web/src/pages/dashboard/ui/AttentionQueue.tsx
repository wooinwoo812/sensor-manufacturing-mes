import {
  ClipboardList,
  PackageSearch,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/shared/ui";

const attentionItems = [
  {
    code: "LOT-MAT-260901-22",
    context: "영향 생산 LOT 2건",
    icon: PackageSearch,
    iconClassName: "bg-danger-soft text-danger-strong",
    railClassName: "border-danger",
    reason: "사후 부적합으로 자재 사용이 차단됐습니다.",
    status: "격리",
    tone: "danger",
  },
  {
    code: "LOT-FPA-260902-03",
    context: "납기 2026-09-03",
    icon: ScanSearch,
    iconClassName: "bg-warning-soft text-warning-strong",
    railClassName: "border-warning",
    reason: "FPA 공정의 필수 최종검사가 남아 있습니다.",
    status: "검사 대기",
    tone: "warning",
  },
  {
    code: "WO-2026-0902-009",
    context: "필요 20 EA · 예약 12 EA",
    icon: ClipboardList,
    iconClassName: "bg-warning-soft text-warning-strong",
    railClassName: "border-warning",
    reason: "작업 시작 전에 자재 8 EA를 추가 예약해야 합니다.",
    status: "자재 부족",
    tone: "warning",
  },
] satisfies ReadonlyArray<{
  code: string;
  context: string;
  icon: LucideIcon;
  iconClassName: string;
  railClassName: string;
  reason: string;
  status: string;
  tone: BadgeTone;
}>;

export function AttentionQueue() {
  return (
    <div className="grid h-full grid-rows-3 divide-y">
      {attentionItems.map(
        ({
          code,
          context,
          icon: Icon,
          iconClassName,
          railClassName,
          reason,
          status,
          tone,
        }) => (
          <article
            className={`flex h-full gap-3 border-s-2 py-4 ps-3 ${railClassName}`}
            key={code}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-md ${iconClassName}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-text-strong">
                  {code}
                </p>
                <Badge tone={tone}>{status}</Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-text">{reason}</p>
              <p className="mt-1 text-xs text-text-muted">{context}</p>
            </div>
          </article>
        ),
      )}
    </div>
  );
}
