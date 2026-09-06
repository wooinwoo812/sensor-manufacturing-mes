import { useNavigationSafety } from "@/shared/lib";
import { useState } from "react";
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
  Button,
  ConfirmDialog,
  ErrorState,
  Input,
  KeyValue,
  KeyValueGrid,
  PageHeading,
  Panel,
  StatusStrip,
  ContentGrid,
  Timeline,
  PriorityBadge,
  Skeleton,
  DataRegion,
  FormActions,
  type BadgeTone,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { BLOCKED_REASON_LABELS } from "@/entities/process-execution";
import { AUDIT_ACTOR_ROLE_OPTIONS } from "@/entities/audit-event";
import { Main, PageCrumb } from "@/widgets/app-shell";

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
  canReadReservations?: boolean;
  canReleaseAllocation: boolean;
  onBack: () => void;
  onOpenReservations?: () => void;
  onOpenProcess?: (id: string, productionLotNumber: string) => void;
  onOpenInspection?: (id: string) => void;
}

/** 감사 이력의 역할 코드는 사람이 읽는 라벨로 보여준다. 모르는 코드는 그대로 둔다. */
function actorRoleLabel(role: string): string {
  return (AUDIT_ACTOR_ROLE_OPTIONS as Record<string, string>)[role] ?? role;
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
  canReadReservations = false,
  canReleaseAllocation,
  onBack,
  onOpenReservations,
  onOpenProcess,
  onOpenInspection,
}: WorkOrderDetailPageProps) {
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState<
    "release" | "cancel" | null
  >(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  useNavigationSafety(cancelReason !== "", commandPending !== null);
  const { state, reload, replace } = useLoadState<{ detail: WorkOrderDetail }>(
    workOrderId,
    (signal) =>
      fetchWorkOrderDetail(workOrderId, signal).then((detail) => ({ detail })),
    "작업지시를 불러오지 못했습니다.",
  );

  if (state.phase === "loading") {
    return (
      <Main id="main-content" tabIndex={-1}>
        <PageHeading
          key="detail-heading"
          title="작업지시"
          eyebrow="작업지시 상세"
          back={{ label: "작업지시 목록", onClick: onBack }}
          description="상세 정보를 불러오고 있습니다."
        />
        <DataRegion
          name="detail"
          loading
          className="gap-4"
          aria-label="작업지시 조회 중"
          role="status"
        >
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </DataRegion>
      </Main>
    );
  }

  if (state.phase === "error") {
    return (
      <Main id="main-content" tabIndex={-1}>
        <PageHeading
          key="detail-heading"
          title="작업지시"
          eyebrow="작업지시 상세"
          back={{ label: "작업지시 목록", onClick: onBack }}
          description="상세 정보를 확인하지 못했습니다. 다시 시도하거나 이전 화면으로 돌아가세요."
        />
        <ErrorState
          description={state.message}
          action={<Button onClick={() => reload()}>다시 시도</Button>}
        />
      </Main>
    );
  }

  const detail = state.detail;
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
      replace({ detail: next });
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
      <PageCrumb value={detail.orderNumber} />
      <PageHeading
        key="detail-heading"
        back={{ label: "작업지시 목록", onClick: onBack }}
        description={`${detail.productName} (${detail.productCode})`}
        eyebrow="작업지시 상세"
        meta={<span>가상 데모 데이터</span>}
        title={detail.orderNumber}
      />
      <DataRegion name="detail">
        <StatusStrip>
          <Badge tone={STATUS_TONES[detail.status] ?? "neutral"}>
            {WORK_ORDER_STATUS_LABELS[detail.status]}
          </Badge>
          <PriorityBadge priority={toPriorityBadgeValue(detail.priority)} />
          <span className="text-xs text-text-muted">
            등록 {formatDateTime(detail.createdAt)}
          </span>
        </StatusStrip>

        <Panel
          description="계획 수량과 납기, 진행 상태를 확인합니다."
          headingLevel="h2"
          title="요약"
          tourAnchor="order-summary"
        >
          <KeyValueGrid columns={4}>
            <KeyValue label="계획수량" size="lg">
              {detail.plannedQuantity.toLocaleString("ko-KR")} {detail.unit}
            </KeyValue>
            <KeyValue label="납기">
              {isDueOverdue(detail.dueDate) && detail.status !== "COMPLETED" ? (
                <Badge tone="danger">{`${formatWorkOrderDueDate(detail.dueDate)} 지연`}</Badge>
              ) : (
                <span className="text-lg font-semibold tabular-nums">
                  {formatWorkOrderDueDate(detail.dueDate)}
                </span>
              )}
            </KeyValue>
            <KeyValue label="진행률" size="lg">
              {detail.progressPercent}%
            </KeyValue>
            <KeyValue label="현재 공정" strong>
              {detail.currentStepName ?? "—"}
            </KeyValue>
          </KeyValueGrid>
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
        </Panel>

        <ContentGrid>
          <Panel
            description="생산 LOT별 공정 준비 상태입니다."
            headingLevel="h3"
            title="공정 흐름"
            tourAnchor="order-flow"
          >
            {detail.steps.length === 0 ? (
              <p className="py-4 text-sm text-text-muted" role="status">
                등록된 공정이 없습니다. 초안 상태 작업지시는 발행 후 공정이
                구성됩니다.
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
                      {onOpenProcess ? (
                        <button
                          type="button"
                          className="text-sm font-semibold text-primary underline underline-offset-4"
                          onClick={() =>
                            onOpenProcess(step.id, step.productionLotNumber)
                          }
                        >
                          {step.processStepName}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold">
                          {step.processStepName}
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-text-muted">
                        {step.productionLotNumber}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {step.blockedReasonCodes.map((code) => (
                        <Badge key={code} tone="warning">
                          {BLOCKED_REASON_LABELS[
                            code as keyof typeof BLOCKED_REASON_LABELS
                          ] ?? "준비 조건 확인 필요"}
                        </Badge>
                      ))}
                      <Badge
                        tone={READINESS_TONES[step.readiness] ?? "neutral"}
                      >
                        {WORK_ORDER_READINESS_LABELS[step.readiness]}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            description="게이트별 검사와 판정 결과입니다."
            headingLevel="h3"
            title="검사"
            tourAnchor="order-inspections"
          >
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
                      {onOpenInspection ? (
                        <button
                          type="button"
                          className="text-xs tabular-nums font-bold text-primary underline underline-offset-4"
                          onClick={() => onOpenInspection(inspection.id)}
                        >
                          {inspection.inspectionNumber}
                        </button>
                      ) : (
                        <span className="text-xs tabular-nums font-bold">
                          {inspection.inspectionNumber}
                        </span>
                      )}
                      <span className="text-sm">
                        {inspection.processStepName}
                      </span>
                      <Badge
                        tone={
                          inspection.gate === "LOT_COMPLETE"
                            ? "info"
                            : "neutral"
                        }
                      >
                        {WORK_ORDER_GATE_LABELS[inspection.gate]}
                      </Badge>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">
                        {
                          WORK_ORDER_EXECUTION_STATUS_LABELS[
                            inspection.executionStatus
                          ]
                        }
                      </Badge>
                      {inspection.verdict === null ? (
                        <Badge tone="neutral">미판정</Badge>
                      ) : (
                        <Badge
                          tone={VERDICT_TONES[inspection.verdict] ?? "neutral"}
                        >
                          {WORK_ORDER_VERDICT_LABELS[inspection.verdict]}
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </ContentGrid>

        <Panel
          description="이 작업지시의 감사 기록입니다."
          headingLevel="h3"
          title="변경 이력"
          tourAnchor="order-history"
        >
          <Timeline
            emptyMessage="아직 기록된 변경이 없습니다."
            items={detail.recentAudits.map((event) => ({
              id: event.id,
              dateTime: event.occurredAt,
              timeLabel: formatDateTime(event.occurredAt),
              title: event.summary,
              description: `${event.actorName} · ${actorRoleLabel(event.actorRole)}`,
            }))}
          />
        </Panel>

        {canReadReservations ? (
          <MaterialReservationPanel
            canRelease={canReleaseAllocation}
            canReserve={canReserve}
            csrfToken={csrfToken}
            isReleased={detail.status === "RELEASED"}
            orderNumber={detail.orderNumber}
            workOrderId={workOrderId}
            requirements={detail.materialRequirements}
            onChanged={reload}
          />
        ) : null}

        <section
          aria-label="작업지시 행동"
          data-tour-region="true"
          data-tour="order-actions"
          className="space-y-3"
        >
          {!canRelease && detail.status === "DRAFT" ? (
            <p className="text-sm text-text-muted">
              발행은 생산계획 담당자가 처리합니다. 현재 역할로는 이 작업지시의
              상태와 이력을 조회할 수 있습니다.
            </p>
          ) : null}
          {canCancelNow && cancelOpen ? (
            <div className="rounded-panel border border-danger-border bg-danger-soft/30 p-4">
              <p className="text-sm font-semibold">작업지시 취소</p>
              <p className="mt-1 text-xs text-text-muted">
                취소 사유를 남기면 감사 이력에 기록됩니다. 실적이 있는 지시는
                취소할 수 없습니다.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-0 basis-64 flex-1">
                  <Input
                    autoFocus
                    id="cancel-reason"
                    label="취소 사유"
                    name="cancelReason"
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="예: 계획 변경으로 생산 제외"
                    value={cancelReason}
                  />
                </div>
              </div>
              <FormActions>
                <Button
                  variant="danger"
                  disabled={
                    cancelReason.trim().length < 2 || commandPending !== null
                  }
                  loading={commandPending === "cancel"}
                  onClick={() =>
                    runCommand("cancel", () =>
                      cancelWorkOrder(
                        workOrderId,
                        cancelReason.trim(),
                        csrfToken,
                      ),
                    )
                  }
                >
                  취소 확정
                </Button>
              </FormActions>
            </div>
          ) : null}
          {commandError !== null ? (
            <p
              role="alert"
              className="rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong"
            >
              {commandError}
            </p>
          ) : null}
          <FormActions tourAnchor="page-actions">
            <Button variant="secondary" onClick={onBack}>
              목록으로
            </Button>
            {canReleaseNow ||
            canCancelNow ||
            (canReadReservations && onOpenReservations !== undefined) ? (
              <>
                {canReadReservations && onOpenReservations ? (
                  <Button variant="secondary" onClick={onOpenReservations}>
                    자재 예약
                  </Button>
                ) : null}
                {canCancelNow ? (
                  <Button
                    aria-expanded={cancelOpen}
                    onClick={() => setCancelOpen((open) => !open)}
                    variant="secondary"
                  >
                    작업지시 취소
                  </Button>
                ) : null}
                {canReleaseNow ? (
                  <ConfirmDialog
                    title={`${detail.orderNumber}을(를) 발행할까요?`}
                    description="발행 후 이 작업지시는 실행 팀에 전달되며 초안으로 되돌릴 수 없습니다."
                    confirmLabel="발행 확정"
                    trigger={
                      <Button loading={commandPending === "release"}>
                        작업지시 발행
                      </Button>
                    }
                    onConfirm={() =>
                      runCommand("release", () =>
                        releaseWorkOrder(workOrderId, csrfToken),
                      )
                    }
                  />
                ) : null}
              </>
            ) : undefined}
          </FormActions>
        </section>
      </DataRegion>
    </Main>
  );
}
