import type { DashboardSummary } from "@/entities/dashboard";
import { Button } from "@/shared/ui";
import { ArrowRight } from "lucide-react";

type DemoCase = NonNullable<DashboardSummary["demoCases"]>[number];

export function DemoStartPoint({ cases, onOpen }: {
  cases: readonly DemoCase[];
  onOpen?: (id: string) => void;
}) {
  const held = cases.find(item => item.hasHeldInspection && item.status === "IN_PROGRESS");
  const reviewed = cases.find(item => item.scenario === "REVIEWED" && item.status === "COMPLETED");
  const target = held ?? reviewed;
  if (!target || !onOpen) return null;

  return (
    <section aria-labelledby="first-work-title" className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-primary/20 bg-accent-soft/40 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-accent-strong">처음 살펴볼 작업</p>
        <h2 id="first-work-title" className="mt-1 text-base font-semibold text-text-strong">{held ? "검사 보류로 멈춘 작업" : "보류 검토 후 완료된 작업"}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          <span className="tabular-nums">{target.orderNumber}</span> · {held ? "차단 사유를 확인하고 연결된 검사를 열어 보세요." : "최초 보류 사유와 검토 후 달라진 판정 이력을 확인해 보세요."}
        </p>
      </div>
      <Button variant="secondary" onClick={() => onOpen(target.id)}>작업 확인 <ArrowRight className="size-4" aria-hidden="true" /></Button>
    </section>
  );
}
