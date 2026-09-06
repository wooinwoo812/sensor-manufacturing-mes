import { RefreshCw, ArrowRight, CalendarDays } from "lucide-react";
import {
  fetchDashboardSummary,
  type DashboardSummary,
  type DashboardAttentionItem,
} from "@/entities/dashboard";
import {
  Badge,
  Button,
  ErrorState,
  PageHeading,
  Panel,
  Skeleton,
  DataRegion,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";
import { AttentionQueue } from "./AttentionQueue";
import { OperationsSummary } from "./OperationsSummary";
import { Overview } from "./Overview";
import { DemoStartPoint } from "./DemoStartPoint";

function formatRefreshedAt(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

interface DashboardPageProps {
  onOpenWorkOrder?: (id: string) => void;
  onOpenAttention?: (item: DashboardAttentionItem) => void;
}

export function DashboardPage({ onOpenAttention, onOpenWorkOrder }: DashboardPageProps = {}) {
  const { state, isRefreshing, reload } = useLoadState<{
    summary: DashboardSummary;
    refreshedAt: string;
  }>(
    "dashboard",
    (signal) =>
      fetchDashboardSummary(signal).then((summary) => ({
        summary,
        refreshedAt: new Date().toISOString(),
      })),
    "운영 현황을 불러오지 못했습니다.",
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        title="운영 대시보드"
        description="생산 흐름을 살피고, 지금 필요한 조치를 확인하세요."
        actions={
          <Button
            data-tour="dashboard-refresh"
            variant="secondary"
            onClick={reload}
            disabled={state.phase === "loading"}
            loading={isRefreshing}
            loadingLabel="현황 갱신 중"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            현황 새로고침
          </Button>
        }
        meta={
          state.phase === "success" ? (
            <time dateTime={state.refreshedAt}>
              {formatRefreshedAt(state.refreshedAt)} 갱신
            </time>
          ) : (
            <span>가상 데모 데이터</span>
          )
        }
      />
      <DataRegion name="dashboard" loading={state.phase === "loading"}>
        {state.phase === "loading" ? (
          <div
            className="grid gap-6"
            aria-label="대시보드 조회 중"
            role="status"
          >
            <Skeleton className="h-36 w-full" />
            <div className="grid gap-6 xl:grid-cols-7">
              <Skeleton className="h-96 xl:col-span-4" />
              <Skeleton className="h-96 xl:col-span-3" />
            </div>
          </div>
        ) : state.phase === "error" ? (
          <ErrorState
            description={state.message}
            action={<Button onClick={reload}>다시 시도</Button>}
          />
        ) : (
          <section
            aria-labelledby="dashboard-summary"
            aria-busy={isRefreshing || undefined}
            className="grid min-w-0 gap-6"
          >
            <h2 className="sr-only" id="dashboard-summary">
              핵심 운영 현황
            </h2>
            <DemoStartPoint cases={state.summary.demoCases ?? []} {...(onOpenWorkOrder ? { onOpen: onOpenWorkOrder } : {})} />
            <OperationsSummary metrics={state.summary.metrics} />
            <div
              className="grid min-w-0 grid-cols-1 items-stretch gap-6 xl:grid-cols-7"
              data-testid="dashboard-detail-grid"
            >
              <Panel
                className="xl:col-span-4"
                title="이번 주 납기 계획 대비 진행"
                tourAnchor="dashboard-plan"
                headingLevel="h3"
                description="납기일 기준 계획 수량 × 완료 공정 비율로 계산합니다."
                actions={
                  <CalendarDays
                    className="size-4 text-text-muted"
                    aria-hidden="true"
                  />
                }
                bodyClassName="grid gap-6"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-text-muted">
                      주간 공정 진행률
                    </p>
                    <strong className="mt-1 block text-4xl font-semibold tracking-tight text-accent-strong tabular-nums">
                      {state.summary.weeklyTotals.completionRate}%
                    </strong>
                  </div>
                  <div className="grid gap-2 text-right">
                    <span className="text-sm font-medium text-text-strong tabular-nums">
                      {state.summary.weeklyTotals.progress.toLocaleString(
                        "ko-KR",
                      )}{" "}
                      <span className="font-normal text-text-muted">
                        /{" "}
                        {state.summary.weeklyTotals.planned.toLocaleString(
                          "ko-KR",
                        )}{" "}
                        EA
                      </span>
                    </span>
                    <div className="flex justify-end gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-sm bg-muted-foreground/30"
                          aria-hidden="true"
                        />
                        계획
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-sm bg-primary"
                          aria-hidden="true"
                        />
                        진행
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  aria-label={`주간 공정 진행률 ${state.summary.weeklyTotals.completionRate}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={state.summary.weeklyTotals.completionRate}
                  className="h-1.5 overflow-hidden rounded-full bg-surface-subtle"
                  role="progressbar"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, state.summary.weeklyTotals.completionRate)}%`,
                    }}
                  />
                </div>
                <Overview weekly={state.summary.weekly} />
              </Panel>
              <Panel
                className="flex flex-col xl:col-span-3"
                title="조치 필요"
                tourAnchor="dashboard-attention"
                headingLevel="h3"
                description="차단과 납기 영향을 먼저 확인하세요."
                actions={
                  <Badge
                    tone={
                      state.summary.attentionQueue.length > 0
                        ? "warning"
                        : "neutral"
                    }
                  >{`${state.summary.attentionQueue.length}건`}</Badge>
                }
                bodyClassName="flex-1 py-0"
              >
                <AttentionQueue
                  items={state.summary.attentionQueue}
                  onOpen={onOpenAttention}
                />
              </Panel>
            </div>
            <Panel
              title="작업지시 진행 현황"
              tourAnchor="dashboard-orders"
              description="전체 작업지시를 현재 상태별로 집계합니다. 취소된 지시는 제외합니다."
              bodyClassName="p-0"
            >
              <ol className="grid grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "초안",
                    detail: "계획 검토",
                    count: state.summary.metrics.workOrders.draft,
                  },
                  {
                    label: "발행",
                    detail: "실행 준비",
                    count: state.summary.metrics.workOrders.released,
                  },
                  {
                    label: "진행 중",
                    detail: "공정 수행",
                    count: state.summary.metrics.workOrders.inProgress,
                  },
                  {
                    label: "완료",
                    detail: "생산 종료",
                    count: state.summary.metrics.workOrders.completed,
                  },
                ].map((step, index) => (
                  <li
                    key={step.label}
                    className="relative grid gap-3 border-border p-5 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0 lg:[&:nth-child(-n+2)]:border-b-0"
                  >
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="grid size-6 place-items-center rounded-full bg-surface-subtle font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      {step.detail}
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{step.label}</span>
                      <strong className="text-2xl font-semibold tabular-nums">
                        {step.count}
                        <span className="ml-1 text-xs font-normal text-text-muted">
                          건
                        </span>
                      </strong>
                    </div>
                    {index < 3 ? (
                      <ArrowRight
                        className="absolute -right-2 top-6 z-[1] hidden size-4 bg-surface text-text-subtle lg:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            </Panel>
            <p className="text-xs text-text-muted">
              가상 데모 데이터 · 현황은 마지막 조회 시점을 기준으로 표시됩니다.
            </p>
          </section>
        )}
      </DataRegion>
    </Main>
  );
}
