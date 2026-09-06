import {
  fetchInspection,
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
  type InspectionDetail,
} from "@/entities/inspection";
import { InspectionVerdictPanel } from "@/features/inspection-verdict";
import {
  Badge,
  Button,
  ErrorState,
  KeyValue,
  KeyValueGrid,
  PageHeading,
  Panel,
  StatusStrip,
  Timeline,
  Skeleton,
  DataRegion,
  type BadgeTone,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { AUDIT_ACTOR_ROLE_OPTIONS } from "@/entities/audit-event";
import { Main, PageCrumb } from "@/widgets/app-shell";

const EXECUTION_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const VERDICT_TONES: Record<string, BadgeTone> = {
  PASS: "success",
  FAIL: "danger",
  HOLD: "warning",
};

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

interface InspectionDetailPageProps {
  inspectionId: string;
  csrfToken: string;
  canVerdict: boolean;
  canReview?: boolean;
  onOpenWorkOrder?: (id: string) => void;
  onBack: () => void;
}

export function InspectionDetailPage({
  inspectionId,
  csrfToken,
  canVerdict,
  canReview = false,
  onOpenWorkOrder,
  onBack,
}: InspectionDetailPageProps) {
  const { state, reload } = useLoadState<{ detail: InspectionDetail }>(
    inspectionId,
    (signal) =>
      fetchInspection(inspectionId, signal).then((detail) => ({ detail })),
    "검사를 불러오지 못했습니다.",
  );

  if (state.phase === "loading") {
    return (
      <Main id="main-content" tabIndex={-1}>
        <PageHeading
          key="detail-heading"
          title="품질검사"
          eyebrow="품질검사 상세"
          back={{ label: "검사 목록", onClick: onBack }}
          description="상세 정보를 불러오고 있습니다."
        />
        <DataRegion
          name="detail"
          loading
          className="gap-4"
          aria-label="검사 조회 중"
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
          title="품질검사"
          eyebrow="품질검사 상세"
          back={{ label: "검사 목록", onClick: onBack }}
          description="상세 정보를 확인하지 못했습니다. 다시 시도하거나 이전 화면으로 돌아가세요."
        />
        <ErrorState
          description={state.message}
          action={
            <>
              <Button onClick={() => reload()}>다시 시도</Button>
              <Button variant="secondary" onClick={onBack}>
                목록으로
              </Button>
            </>
          }
        />
      </Main>
    );
  }

  const detail = state.detail;
  const canVerdictNow =
    canVerdict &&
    detail.eligibility.canVerdict &&
    ["PENDING", "IN_PROGRESS"].includes(detail.executionStatus);
  const canReviewNow = canReview && detail.eligibility.canReview;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageCrumb value={detail.inspectionNumber} />
      <PageHeading
        key="detail-heading"
        back={{ label: "검사 목록", onClick: onBack }}
        description={`${detail.productName} (${detail.productCode})`}
        eyebrow="품질검사 상세"
        meta={<span>가상 데모 데이터</span>}
        title={detail.inspectionNumber}
      />
      <DataRegion name="detail">
        <StatusStrip>
          <Badge tone={detail.gate === "LOT_COMPLETE" ? "info" : "neutral"}>
            {INSPECTION_GATE_LABELS[detail.gate]}
          </Badge>
          <Badge tone={EXECUTION_TONES[detail.executionStatus] ?? "neutral"}>
            {INSPECTION_EXECUTION_STATUS_LABELS[detail.executionStatus]}
          </Badge>
          {detail.verdict === null ? (
            <Badge tone="neutral">미판정</Badge>
          ) : (
            <Badge tone={VERDICT_TONES[detail.verdict] ?? "neutral"}>
              {INSPECTION_VERDICT_LABELS[detail.verdict]}
            </Badge>
          )}
          <span className="text-xs text-text-muted">
            등록 {formatDateTime(detail.createdAt)}
          </span>
        </StatusStrip>

        <Panel
          description="적용 규격과 대상, 판정 근거를 확인합니다."
          headingLevel="h2"
          title="검사 개요"
          tourAnchor="inspection-summary"
        >
          <KeyValueGrid columns={3}>
            <KeyValue label="검사 규격" strong>
              {detail.specName}
            </KeyValue>
            <KeyValue label="작업지시" strong>
              <button
                className="tabular-nums text-accent-strong underline underline-offset-4"
                onClick={() => onOpenWorkOrder?.(detail.workOrderId)}
              >
                {detail.workOrderNumber}
              </button>
            </KeyValue>
            <KeyValue label="생산 LOT / 공정">
              <span className="tabular-nums">{detail.productionLotNumber}</span>
              {` · ${detail.processStepName}`}
            </KeyValue>
            <KeyValue label="완료 일시">
              {detail.completedAt === null ? (
                <span className="text-text-muted">—</span>
              ) : (
                <time className="tabular-nums" dateTime={detail.completedAt}>
                  {formatDateTime(detail.completedAt)}
                </time>
              )}
            </KeyValue>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-text-muted">
                판정 메모
              </dt>
              <dd className="mt-1 text-sm">
                {detail.verdictMemo === null || detail.verdictMemo === "" ? (
                  <span className="text-text-muted">
                    기록된 메모가 없습니다.
                  </span>
                ) : (
                  detail.verdictMemo
                )}
              </dd>
            </div>
          </KeyValueGrid>
        </Panel>

        {detail.decisions.length > 0 ? (
          <Panel
            title="판정 이력"
            headingLevel="h2"
            description="최초 판정과 보류 검토의 사유·담당자를 시간순으로 확인합니다."
          >
            <Timeline
              emptyMessage="판정 이력이 없습니다."
              items={detail.decisions.map((decision) => ({
                id: decision.id,
                dateTime: decision.occurredAt,
                timeLabel: formatDateTime(decision.occurredAt),
                title: `${decision.phase === "HOLD_REVIEW" ? "보류 검토" : decision.phase === "LEGACY" ? "기존 판정" : "최초 판정"} · ${INSPECTION_VERDICT_LABELS[decision.verdict]}`,
                description: `${decision.memo ?? "사유 없음"} · ${decision.actorName ?? "기존 기록: 담당자 정보 없음"}${decision.actorRole ? ` (${actorRoleLabel(decision.actorRole)})` : ""}`,
              }))}
            />
          </Panel>
        ) : null}
        <Panel
          description="이 검사의 감사 기록입니다."
          headingLevel="h3"
          title="변경 이력"
          tourAnchor="inspection-history"
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
        {detail.eligibility.blockedReason &&
        (detail.verdict === null || detail.verdict === "HOLD") ? (
          <p className="rounded-panel border border-warning-border bg-warning-soft p-4 text-sm text-warning-strong">
            {detail.eligibility.blockedReason}
          </p>
        ) : null}
        {detail.verdict === "HOLD" && !canReview ? (
          <p className="text-sm text-text-muted">
            품질 담당자 또는 시스템 관리자가 보류를 검토할 수 있습니다.
          </p>
        ) : null}
        {canVerdictNow || canReviewNow ? (
          <InspectionVerdictPanel
            review={canReviewNow}
            csrfToken={csrfToken}
            onDone={() => reload()}
            target={{
              inspectionId: detail.id,
              inspectionNumber: detail.inspectionNumber,
              specName: detail.specName,
              productionLotNumber: detail.productionLotNumber,
            }}
          />
        ) : null}
      </DataRegion>
    </Main>
  );
}
