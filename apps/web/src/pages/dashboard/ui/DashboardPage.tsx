import {
  fetchDashboardSummary,
  type DashboardSummary,
  type DashboardAttentionItem,
} from "@/entities/dashboard";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  PageHeading,
  Skeleton,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";
import { AttentionQueue } from "./AttentionQueue";
import { OperationsSummary } from "./OperationsSummary";
import { Overview } from "./Overview";

function formatRefreshedAt(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}


interface DashboardPageProps {
  onOpenAttention?: (item: DashboardAttentionItem) => void;
}

export function DashboardPage({ onOpenAttention }: DashboardPageProps = {}) {
  const { state, reload } = useLoadState<{ summary: DashboardSummary; refreshedAt: string }>(
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
        description="생산·자재·품질 현황을 한곳에서 확인합니다."
        meta={
          state.phase === "success" ? (
            <p className="flex items-center gap-2">
              <span>가상 데모 데이터</span>
              <span aria-hidden="true">·</span>
              <time dateTime={state.refreshedAt}>
                {formatRefreshedAt(state.refreshedAt)} 갱신
              </time>
            </p>
          ) : (
            <span>가상 데모 데이터</span>
          )
        }
        title="운영 대시보드"
      />

      {state.phase === "loading" ? (
        <div className="space-y-4" aria-label="대시보드 조회 중" role="status">
          <Skeleton className="h-36 w-full" />
          <div className="grid gap-4 xl:grid-cols-7">
            <Skeleton className="h-80 xl:col-span-4" />
            <Skeleton className="h-80 xl:col-span-3" />
          </div>
        </div>
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={
            <Button onClick={() => reload()}>
              다시 시도
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="dashboard-summary" className="space-y-4">
          <h2 className="sr-only" id="dashboard-summary">
            핵심 운영 현황
          </h2>
          <OperationsSummary metrics={state.summary.metrics} />

          <div
            className="grid grid-cols-1 gap-4 xl:grid-cols-7"
            data-testid="dashboard-detail-grid"
          >
            <Card className="col-span-1 gap-0 overflow-hidden border-border-strong py-0 xl:col-span-4">
              <CardHeader className="border-b bg-surface-subtle/50 px-5 py-4 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
                  <div>
                    <CardTitle>
                      <h3>이번 주 납기 계획 대비 진행</h3>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      작업지시 납기별 계획 수량과 진행률 반영 수량을 비교합니다.
                    </CardDescription>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-sm bg-muted-foreground/30"
                        />{" "}
                        계획
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-sm bg-primary"
                        />{" "}
                        진행
                      </span>
                    </div>
                  </div>
                  <div className="sm:border-s sm:border-border sm:ps-4">
                    <p className="text-xs font-semibold text-text-muted">
                      주간 달성률
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <strong className="tabular-nums text-2xl font-bold text-accent-strong">
                        {state.summary.weeklyTotals.completionRate}%
                      </strong>
                      <span className="text-xs text-text-muted">
                        {state.summary.weeklyTotals.progress.toLocaleString("ko-KR")} /{" "}
                        {state.summary.weeklyTotals.planned.toLocaleString("ko-KR")} EA
                      </span>
                    </div>
                    <div
                      aria-label={`주간 생산 달성률 ${state.summary.weeklyTotals.completionRate}%`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={state.summary.weeklyTotals.completionRate}
                      className="mt-2 h-2 overflow-hidden rounded-sm bg-border"
                      role="progressbar"
                    >
                      <span
                        className="block h-full bg-primary"
                        style={{
                          width: `${state.summary.weeklyTotals.completionRate}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 pe-5 ps-2 sm:py-6 sm:pe-6">
                <Overview weekly={state.summary.weekly} />
              </CardContent>
            </Card>
            <Card className="col-span-1 gap-0 overflow-hidden border-border-strong py-0 xl:col-span-3">
              <CardHeader className="border-b bg-surface-subtle/50 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      <h3>조치 필요</h3>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      차단 상태와 납기 영향을 우선순위로 확인합니다.
                    </CardDescription>
                  </div>
                  <Badge tone="danger">
                    {`${state.summary.attentionQueue.length}건`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 px-5 py-1 sm:px-6">
                <AttentionQueue items={state.summary.attentionQueue} onOpen={onOpenAttention} />
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </Main>
  );
}
