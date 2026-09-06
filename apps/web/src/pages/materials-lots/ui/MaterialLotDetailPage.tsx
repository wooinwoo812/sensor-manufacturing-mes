import {
  daysUntil,
  fetchMaterialLot,
  formatMaterialLotDate,
  MATERIAL_LOT_DISPOSITION_LABELS,
  type MaterialLotDetail,
} from "@/entities/material-lot";
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

const DISPOSITION_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  ACCEPTED: "success",
  HOLD: "warning",
  QUARANTINED: "danger",
  REJECTED: "neutral",
};

const ALLOCATION_STATUS_LABELS = {
  ACTIVE: "예약 중",
  CLOSED: "종료",
} as const;

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

interface MaterialLotDetailPageProps {
  materialLotId: string;
  onBack: () => void;
  onOpenTrace?: (lotNumber: string) => void;
}

export function MaterialLotDetailPage({
  materialLotId,
  onBack,
  onOpenTrace,
}: MaterialLotDetailPageProps) {
  const { state, reload } = useLoadState<{ detail: MaterialLotDetail }>(
    materialLotId,
    (signal) =>
      fetchMaterialLot(materialLotId, signal).then((detail) => ({ detail })),
    "자재 LOT을 불러오지 못했습니다.",
  );

  if (state.phase === "loading") {
    return (
      <Main id="main-content" tabIndex={-1}>
        <PageHeading
          key="detail-heading"
          title="자재 LOT"
          eyebrow="자재 LOT 상세"
          back={{ label: "자재 LOT 목록", onClick: onBack }}
          description="상세 정보를 불러오고 있습니다."
        />
        <DataRegion
          name="detail"
          loading
          className="gap-4"
          aria-label="자재 LOT 조회 중"
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
          title="자재 LOT"
          eyebrow="자재 LOT 상세"
          back={{ label: "자재 LOT 목록", onClick: onBack }}
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
  const expiryWarning =
    detail.expiresAt !== null && daysUntil(detail.expiresAt) <= 7;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageCrumb value={detail.lotNumber} />
      <PageHeading
        key="detail-heading"
        back={{ label: "자재 LOT 목록", onClick: onBack }}
        description={`${detail.materialName} (${detail.materialCode})`}
        eyebrow="자재 LOT 상세"
        meta={<span>가상 데모 데이터</span>}
        title={detail.lotNumber}
        actions={
          onOpenTrace !== undefined ? (
            <Button
              variant="secondary"
              onClick={() => onOpenTrace(detail.lotNumber)}
            >
              계보 추적하기
            </Button>
          ) : undefined
        }
      />
      <DataRegion name="detail">
        <StatusStrip>
          <Badge
            tone={DISPOSITION_TONES[detail.qualityDisposition] ?? "neutral"}
          >
            {MATERIAL_LOT_DISPOSITION_LABELS[detail.qualityDisposition]}
          </Badge>
          <span className="text-xs text-text-muted">
            입고 {formatDateTime(detail.receivedAt)}
          </span>
          {detail.expiresAt !== null ? (
            expiryWarning ? (
              <Badge tone="danger">
                {`유효기간 ${formatMaterialLotDate(detail.expiresAt)} (${daysUntil(detail.expiresAt) < 0 ? "만료" : daysUntil(detail.expiresAt) === 0 ? "오늘 만료" : `D-${daysUntil(detail.expiresAt)}`})`}
              </Badge>
            ) : (
              <span className="text-xs text-text-muted">
                {`유효기간 ${formatMaterialLotDate(detail.expiresAt)}`}
              </span>
            )
          ) : (
            <span className="text-xs text-text-muted">유효기간 제한 없음</span>
          )}
        </StatusStrip>

        <Panel
          description="입고부터 소비·폐기까지의 수량과 현재 가용량입니다."
          headingLevel="h2"
          title="수량 요약"
          tourAnchor="lot-quantity"
        >
          <KeyValueGrid columns={5}>
            <KeyValue label="입고" size="lg">
              {detail.receivedQuantity.toLocaleString("ko-KR")} {detail.unit}
            </KeyValue>
            <KeyValue label="재고" size="lg">
              {detail.onHand.toLocaleString("ko-KR")} {detail.unit}
            </KeyValue>
            <KeyValue label="예약" size="lg">
              {detail.reservedQuantity.toLocaleString("ko-KR")} {detail.unit}
            </KeyValue>
            <KeyValue label="가용">
              {detail.availableQuantity === 0 ? (
                <Badge tone="danger">{`0 ${detail.unit}`}</Badge>
              ) : (
                <span className="text-lg font-semibold tabular-nums">
                  {detail.availableQuantity.toLocaleString("ko-KR")}{" "}
                  {detail.unit}
                </span>
              )}
            </KeyValue>
            <KeyValue label="소비 / 폐기" size="lg">
              {detail.consumedQuantity.toLocaleString("ko-KR")} /{" "}
              {detail.scrappedQuantity.toLocaleString("ko-KR")} {detail.unit}
            </KeyValue>
          </KeyValueGrid>
          {detail.qualityDisposition !== "ACCEPTED" ? (
            <p className="mt-4 text-sm text-text-muted">
              현재 품질 상태에서는 신규 예약과 실제 투입이 차단됩니다. 기존
              예약은 유지되며 투입 시점에 다시 검증합니다.
            </p>
          ) : null}
        </Panel>

        <Panel
          description="이 LOT으로 작업지시에 보류한 예약입니다."
          headingLevel="h3"
          title="예약 내역"
          tourAnchor="lot-reservations"
        >
          {detail.allocations.length === 0 ? (
            <p className="py-4 text-sm text-text-muted" role="status">
              이 LOT에 대한 예약이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.allocations.map((allocation) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                  key={allocation.id}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs tabular-nums font-bold">
                      {allocation.workOrderNumber}
                    </span>
                    <span className="text-sm tabular-nums">
                      {allocation.quantity.toLocaleString("ko-KR")}{" "}
                      {detail.unit}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatDateTime(allocation.createdAt)}
                    </span>
                  </span>
                  <Badge
                    tone={allocation.status === "ACTIVE" ? "info" : "neutral"}
                  >
                    {ALLOCATION_STATUS_LABELS[allocation.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          description="이 LOT의 품질 처분과 감사 기록입니다."
          headingLevel="h3"
          title="품질·변경 이력"
          tourAnchor="lot-history"
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
      </DataRegion>
    </Main>
  );
}
