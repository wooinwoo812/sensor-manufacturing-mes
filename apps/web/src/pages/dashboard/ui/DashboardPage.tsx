import { ArrowRight, CheckCircle2, CircleDotDashed } from "lucide-react";
import { ApiConnectionStatus } from "@/widgets/api-connection-status";

const readinessItems = [
  { label: "Frontend architecture", value: "FSD 경계 적용", ready: true },
  { label: "Navigation", value: "전체 업무영역 배치", ready: true },
  { label: "Domain features", value: "수직 기능 PR에서 연결", ready: false },
] as const;

export function DashboardPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
        <div className="border-b border-border bg-[linear-gradient(135deg,var(--mes-color-surface)_0%,var(--mes-color-accent-soft)_100%)] px-6 py-7 xl:px-8 xl:py-8">
          <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-accent">
            FOUNDATION / ISSUE 09
          </span>
          <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-text-strong xl:text-3xl">
            제조 실행의 판단과 행동이 한 셸에서 이어집니다
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            작업지시, 자재, 공정, 품질과 LOT 계보가 같은 정보 우선순위와
            상태 표현을 사용하도록 공통 기반을 먼저 고정했습니다.
          </p>
        </div>
        <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {readinessItems.map((item) => (
            <div className="px-5 py-4" key={item.label}>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {item.ready ? (
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                ) : (
                  <CircleDotDashed className="size-4 text-text-subtle" aria-hidden="true" />
                )}
                {item.label}
              </div>
              <strong className="mt-2 block text-sm text-text-strong">{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <ApiConnectionStatus />

      <section className="xl:col-span-2 rounded-panel border border-border bg-surface px-5 py-4 shadow-panel" aria-labelledby="next-slice-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-text-muted">
              NEXT VERTICAL SLICE
            </span>
            <h2 className="mt-1 text-base font-bold text-text-strong" id="next-slice-heading">
              작업지시 목록에서 첫 실제 업무 흐름을 연결합니다
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent-strong">
            Issue #11에서 구현
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </section>
    </div>
  );
}
