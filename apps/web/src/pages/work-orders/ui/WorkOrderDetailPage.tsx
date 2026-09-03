import { useEffect, useState } from "react";
import {
  cancelWorkOrder,
  fetchWorkOrderDetail,
  formatWorkOrderDueDate,
  isDueOverdue,
  releaseWorkOrder,
  toPriorityBadgeValue,
  WORK_ORDER_EXECUTION_STATUS_LABELS,
  WORK_ORDER_GATE_LABELS,
  WORK_ORDER_READINESS_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_VERDICT_LABELS,
  type WorkOrderDetail,
} from "@/entities/work-order";
import { ApiRequestError } from "@/shared/api";
import { MaterialReservationPanel } from "@/features/material-reservations";
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  ErrorState,
  Input,
  PageHeading,
  PriorityBadge,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  RELEASED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const READINESS_TONES: Record<string, BadgeTone> = {
  WAITING: "neutral",
  READY: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  BLOCKED: "danger",
};

const VERDICT_TONES: Record<string, BadgeTone> = {
  PASS: "success",
  FAIL: "danger",
  HOLD: "warning",
};

interface WorkOrderDetailPageProps {
  workOrderId: string;
  csrfToken: string;
  canRelease: boolean;
  canCancel: boolean;
  canReserve: boolean;
  canReleaseAllocation: boolean;
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function WorkOrderDetailPage({
  workOrderId,
  csrfToken,
  canRelease,
  canCancel,
  canReserve,
  canReleaseAllocation,
}: WorkOrderDetailPageProps) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    detail: WorkOrderDetail | null;
    error: string | null;
  } | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState<"release" | "cancel" | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchWorkOrderDetail(workOrderId, controller.signal)
      .then((detail) => {
        if (active) {
          setResult({ key: workOrderId, detail, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            key: workOrderId,
            detail: null,
            error:
              error instanceof ApiRequestError
                ? error.message
                : "작업지시를 불러오지 못했습니다.",
          });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [workOrderId, reloadCount]);

  if (result === null || result.key !== workOrderId) {
    return (
      <Main id="main-content" tabIndex={-1}>
        <div className="space-y-4" aria-label="작업지시 조회 중" role="status">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Main>
    );
  }

  if (result.detail === null) {
    return (
      <Main id="main-content" tabIndex={-1}>
        <ErrorState
          description={result.error ?? "작업지시를 불러오지 못했습니다."}
          action={
            <Button onClick={() => setReloadCount((count) => count + 1)}>
              다시 시도
            </Button>
          }
        />
      </Main>
    );
  }

  const detail = result.detail;
  const canReleaseNow = canRelease && detail.status === "DRAFT";
  const canCancelNow =
    canCancel && (detail.status === "DRAFT" || detail.status === "RELEASED");

  async function runCommand(
    action: "release" | "cancel",
    run: () => Promise<WorkOrderDetail>,
  ) {
    setCommandPending(action);
    setCommandError(null);
    try {
      const next = await run();
      setResult({ key: workOrderId, detail: next, error: null });
    } catch (error: unknown) {
      setCommandError(
        error instanceof ApiRequestError
          ? error.message
          : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setCommandPending(null);
    }
  }

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description={`${detail.productName} (${detail.productCode})`}
        meta={<span>가상 데모 데이터</span>}
        title={detail.orderNumber}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={STATUS_TONES[detail.status] ?? "neutral"}>
          {WORK_ORDER_STATUS_LABELS[detail.status]}
        </Badge>
        <PriorityBadge priority={toPriorityBadgeValue(detail.priority)} />
        <span className="text-xs text-text-muted">
          등록 {formatDateTime(detail.createdAt)}
        </span>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>
            <h2>요약</h2>
          </CardTitle>
          <CardDescription>계획 수량과 납기, 진행 상태를 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold text-text-muted">계획수량</dt>
              <dd className="mt-1 font-mono text-lg font-bold tabular-nums">
                {detail.plannedQuantity.toLocaleString("ko-KR")} {detail.unit}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">납기</dt>
              <dd className="mt-1">
                {isDueOverdue(detail.dueDate) && detail.status !== "COMPLETED" ? (
                  <Badge tone="danger">{`${formatWorkOrderDueDate(detail.dueDate)} 지연`}</Badge>
                ) : (
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {formatWorkOrderDueDate(detail.dueDate)}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">진행률</dt>
              <dd className="mt-1 font-mono text-lg font-bold tabular-nums">
                {detail.progressPercent}%
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">현재 공정</dt>
              <dd className="mt-1 text-sm font-semibold">
                {detail.currentStepName ?? "—"}
              </dd>
            </div>
          </dl>
          {detail.blockedReason !== null ? (
            <p className="mt-4 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
              차단 사유: {detail.blockedReason}
            </p>
          ) : null}
          {detail.memo !== null && detail.memo !== "" ? (
            <p className="mt-4 text-sm text-text">
              <span className="font-semibold">메모 · </span>
              {detail.memo}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle>
              <h3>공정 흐름</h3>
            </CardTitle>
            <CardDescription>생산 LOT별 공정 준비 상태입니다.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {detail.steps.length === 0 ? (
              <p className="py-4 text-sm text-text-muted" role="status">
                등록된 공정이 없습니다. 초안 상태 작업지시는 발행 후 공정이 구성됩니다.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {detail.steps.map((step) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                    key={step.id}
                  >
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-xs text-text-muted">
                        {String(step.sequence).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold">{step.processStepName}</span>
                      <span className="font-mono text-xs text-text-muted">
                        {step.productionLotNumber}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {step.blockedReasonCodes.map((code) => (
                        <Badge key={code} tone="warning">
                          {code}
                        </Badge>
                      ))}
                      <Badge tone={READINESS_TONES[step.readiness] ?? "neutral"}>
                        {WORK_ORDER_READINESS_LABELS[step.readiness]}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle>
              <h3>검사</h3>
            </CardTitle>
            <CardDescription>게이트별 검사와 판정 결과입니다.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {detail.inspections.length === 0 ? (
              <p className="py-4 text-sm text-text-muted" role="status">
                등록된 검사가 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {detail.inspections.map((inspection) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                    key={inspection.id}
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold">
                        {inspection.inspectionNumber}
                      </span>
                      <span className="text-sm">{inspection.processStepName}</span>
                      <Badge tone={inspection.gate === "LOT_COMPLETE" ? "info" : "neutral"}>
                        {WORK_ORDER_GATE_LABELS[inspection.gate]}
                      </Badge>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">
                        {WORK_ORDER_EXECUTION_STATUS_LABELS[inspection.executionStatus]}
                      </Badge>
                      {inspection.verdict === null ? (
                        <Badge tone="neutral">미판정</Badge>
                      ) : (
                        <Badge tone={VERDICT_TONES[inspection.verdict] ?? "neutral"}>
                          {WORK_ORDER_VERDICT_LABELS[inspection.verdict]}
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>
            <h3>변경 이력</h3>
          </CardTitle>
          <CardDescription>이 작업지시의 감사 기록입니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {detail.recentAudits.length === 0 ? (
            <p className="py-4 text-sm text-text-muted" role="status">
              아직 기록된 변경이 없습니다.
            </p>
          ) : (
            <ol className="space-y-3">
              {detail.recentAudits.map((event) => (
                <li className="flex flex-wrap items-baseline gap-2" key={event.id}>
                  <time className="tabular-nums text-xs text-text-muted">
                    {formatDateTime(event.occurredAt)}
                  </time>
                  <span className="text-sm font-semibold">{event.actorName}</span>
                  <span className="text-xs text-text-muted">{event.actorRole}</span>
                  <span className="text-sm text-text">{event.summary}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <MaterialReservationPanel
        canRelease={canReleaseAllocation}
        canReserve={canReserve}
        csrfToken={csrfToken}
        isReleased={detail.status === "RELEASED"}
        orderNumber={detail.orderNumber}
        workOrderId={workOrderId}
      />

      <section aria-label="작업지시 행동" className="space-y-3">
        <h2 className="sr-only">작업지시 행동</h2>
        {canReleaseNow ? (
          <ConfirmDialog
            title={`${detail.orderNumber}을(를) 발행할까요?`}
            description="발행 후 이 작업지시는 실행 팀에 전달되며 초안으로 되돌릴 수 없습니다."
            confirmLabel="발행 확정"
            trigger={
              <Button loading={commandPending === "release"}>작업지시 발행</Button>
            }
            onConfirm={() =>
              runCommand("release", () => releaseWorkOrder(workOrderId, csrfToken))
            }
          />
        ) : null}
        {canCancelNow ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <p className="text-sm font-semibold">작업지시 취소</p>
            <p className="mt-1 text-xs text-text-muted">
              취소 사유를 남기면 감사 이력에 기록됩니다. 실적이 있는 지시는 취소할 수
              없습니다.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <Input
                  id="cancel-reason"
                  label="취소 사유"
                  name="cancelReason"
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="예: 계획 변경으로 생산 제외"
                  value={cancelReason}
                />
              </div>
              <Button
                variant="danger"
                disabled={cancelReason.trim().length < 2 || commandPending !== null}
                loading={commandPending === "cancel"}
                onClick={() =>
                  runCommand("cancel", () =>
                    cancelWorkOrder(workOrderId, cancelReason.trim(), csrfToken),
                  )
                }
              >
                취소 확정
              </Button>
            </div>
          </div>
        ) : null}
        {!canRelease && detail.status === "DRAFT" ? (
          <p className="text-xs text-text-muted">
            발행은 생산계획 담당자 권한(work-order:release)이 필요합니다. 현재 역할로는
            이 작업지시의 상태와 이력을 조회할 수 있습니다.
          </p>
        ) : null}
        {commandError !== null ? (
          <p className="rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
            {commandError}
          </p>
        ) : null}
      </section>
    </Main>
  );
}
