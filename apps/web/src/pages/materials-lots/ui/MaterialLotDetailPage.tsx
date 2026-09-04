import { useEffect, useState } from "react";
import {
  daysUntil,
  fetchMaterialLot,
  formatMaterialLotDate,
  MATERIAL_LOT_DISPOSITION_LABELS,
  type MaterialLotDetail,
} from "@/entities/material-lot";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  Button,
  ErrorState,
  KeyValue,
  KeyValueGrid,
  PageHeading,
  Panel,
  Skeleton,
  type BadgeTone,
} from "@/shared/ui";
import { AUDIT_ACTOR_ROLE_OPTIONS } from "@/entities/audit-event";
import { Main } from "@/widgets/app-shell";

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
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    detail: MaterialLotDetail | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchMaterialLot(materialLotId, controller.signal)
      .then((detail) => {
        if (active) {
          setResult({ key: materialLotId, detail, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            key: materialLotId,
            detail: null,
            error:
              error instanceof ApiRequestError
                ? error.message
                : "자재 LOT을 불러오지 못했습니다.",
          });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [materialLotId, reloadCount]);

  if (result === null || result.key !== materialLotId) {
    return (
      <Main id="main-content" tabIndex={-1}>
        <div className="space-y-4" aria-label="자재 LOT 조회 중" role="status">
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
          description={result.error ?? "자재 LOT을 불러오지 못했습니다."}
          action={
            <>
              <Button onClick={() => setReloadCount((count) => count + 1)}>
                다시 시도
              </Button>
              <Button variant="secondary" onClick={onBack}>
                목록으로
              </Button>
            </>
          }
        />
      </Main>
    );
  }

  const detail = result.detail;
  const expiryWarning =
    detail.expiresAt !== null && daysUntil(detail.expiresAt) <= 7;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description={`${detail.materialName} (${detail.materialCode})`}
        meta={<span>가상 데모 데이터</span>}
        title={detail.lotNumber}
        actions={
          onOpenTrace !== undefined ? (
            <Button variant="secondary" onClick={() => onOpenTrace(detail.lotNumber)}>
              계보 추적하기
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={DISPOSITION_TONES[detail.qualityDisposition] ?? "neutral"}>
          {MATERIAL_LOT_DISPOSITION_LABELS[detail.qualityDisposition]}
        </Badge>
        <span className="text-xs text-text-muted">
          입고 {formatDateTime(detail.receivedAt)}
        </span>
        {detail.expiresAt !== null ? (
          expiryWarning ? (
            <Badge tone="danger">
              {`유효기간 ${formatMaterialLotDate(detail.expiresAt)} (D-${daysUntil(detail.expiresAt)})`}
            </Badge>
          ) : (
            <span className="text-xs text-text-muted">
              {`유효기간 ${formatMaterialLotDate(detail.expiresAt)}`}
            </span>
          )
        ) : (
          <span className="text-xs text-text-muted">유효기간 제한 없음</span>
        )}
      </div>

      <Panel description="입고부터 소비·폐기까지의 수량과 현재 가용량입니다." headingLevel="h2" title="수량 요약">
          <KeyValueGrid columns={5}>
            <KeyValue label="입고" size="lg">{detail.receivedQuantity.toLocaleString("ko-KR")} {detail.unit}</KeyValue>
            <KeyValue label="재고" size="lg">{detail.onHand.toLocaleString("ko-KR")} {detail.unit}</KeyValue>
            <KeyValue label="예약" size="lg">{detail.reservedQuantity.toLocaleString("ko-KR")} {detail.unit}</KeyValue>
            <KeyValue label="가용">{detail.availableQuantity === 0 ? (
                  <Badge tone="danger">{`0 ${detail.unit}`}</Badge>
                ) : (
                  <span className="text-lg font-semibold tabular-nums">
                    {detail.availableQuantity.toLocaleString("ko-KR")} {detail.unit}
                  </span>
                )}</KeyValue>
            <KeyValue label="소비 / 폐기" size="lg">{detail.consumedQuantity.toLocaleString("ko-KR")} /{" "}
                {detail.scrappedQuantity.toLocaleString("ko-KR")} {detail.unit}</KeyValue>
          </KeyValueGrid>
          {detail.qualityDisposition !== "ACCEPTED" ? (
            <p className="mt-4 text-sm text-text-muted">
              현재 품질 상태에서는 신규 예약과 실제 투입이 차단됩니다. 기존 예약은
              유지되며 투입 시점에 다시 검증합니다.
            </p>
          ) : null}
        </Panel>

      <Panel description="이 LOT으로 작업지시에 보류한 예약입니다." headingLevel="h3" title="예약 내역">
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
                    <span className="font-mono text-xs font-bold">
                      {allocation.workOrderNumber}
                    </span>
                    <span className="text-sm tabular-nums">
                      {allocation.quantity.toLocaleString("ko-KR")} {detail.unit}
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

      <Panel description="이 LOT의 품질 처분과 감사 기록입니다." headingLevel="h3" title="품질·변경 이력">
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
                  <span className="text-xs text-text-muted">{actorRoleLabel(event.actorRole)}</span>
                  <span className="text-sm text-text">{event.summary}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
    </Main>
  );
}
