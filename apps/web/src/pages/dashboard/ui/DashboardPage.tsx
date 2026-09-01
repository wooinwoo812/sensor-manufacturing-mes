import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeading,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import { weeklyProductionSummary } from "../model/dashboard-fixtures";
import { AttentionQueue } from "./AttentionQueue";
import { OperationsSummary } from "./OperationsSummary";
import { Overview } from "./Overview";

export function DashboardPage() {
  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="생산·자재·품질 현황을 한곳에서 확인합니다."
        meta={
          <p className="flex items-center gap-2">
            <span>가상 데모 데이터</span>
            <span aria-hidden="true">·</span>
            <time dateTime="2026-09-02">2026-09-02 기준</time>
          </p>
        }
        title="운영 대시보드"
      />

      <section aria-labelledby="dashboard-summary" className="space-y-4">
        <h2 className="sr-only" id="dashboard-summary">
          핵심 운영 현황
        </h2>
        <OperationsSummary />

        <div
          className="grid grid-cols-1 gap-4 xl:grid-cols-7"
          data-testid="dashboard-detail-grid"
        >
          <Card className="col-span-1 gap-0 overflow-hidden border-border-strong py-0 xl:col-span-4">
            <CardHeader className="border-b bg-surface-subtle/50 px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
                <div>
                  <CardTitle>
                    <h3>주간 생산 실적</h3>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    계획 수량과 공정 완료 수량을 비교합니다.
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
                      완료
                    </span>
                  </div>
                </div>
                <div className="sm:border-s sm:border-border sm:ps-4">
                  <p className="text-xs font-semibold text-text-muted">
                    주간 달성률
                  </p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <strong className="font-mono text-2xl font-bold text-accent-strong">
                      {weeklyProductionSummary.completionRate}%
                    </strong>
                    <span className="text-xs text-text-muted">
                      {weeklyProductionSummary.completed} /{" "}
                      {weeklyProductionSummary.planned} EA
                    </span>
                  </div>
                  <div
                    aria-label={`주간 생산 달성률 ${weeklyProductionSummary.completionRate}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={weeklyProductionSummary.completionRate}
                    className="mt-2 h-2 overflow-hidden rounded-sm bg-border"
                    role="progressbar"
                  >
                    <span
                      className="block h-full bg-primary"
                      style={{
                        width: `${weeklyProductionSummary.completionRate}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-5 pe-5 ps-2 sm:py-6 sm:pe-6">
              <Overview />
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
                <Badge tone="danger">3건</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 px-5 py-1 sm:px-6">
              <AttentionQueue />
            </CardContent>
          </Card>
        </div>
      </section>
    </Main>
  );
}
