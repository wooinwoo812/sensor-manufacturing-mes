import { useEffect, useState } from "react";
import {
  fetchInspection,
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
  type InspectionDetail,
} from "@/entities/inspection";
import { InspectionVerdictPanel } from "@/features/inspection-verdict";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  type BadgeTone,
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
import { Main } from "@/widgets/app-shell";

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
  onBack: () => void;
}

export function InspectionDetailPage({
  inspectionId,
  csrfToken,
  canVerdict,
  onBack,
}: InspectionDetailPageProps) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    detail: InspectionDetail | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchInspection(inspectionId, controller.signal)
      .then((detail) => {
        if (active) {
          setResult({ key: inspectionId, detail, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({
            key: inspectionId,
            detail: null,
            error:
              error instanceof ApiRequestError
                ? error.message
                : "검사를 불러오지 못했습니다.",
          });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [inspectionId, reloadCount]);

  if (result === null || result.key !== inspectionId) {
    return (
      <Main id="main-content" tabIndex={-1}>
        <div className="space-y-4" aria-label="검사 조회 중" role="status">
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
          description={result.error ?? "검사를 불러오지 못했습니다."}
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
  const canVerdictNow =
    canVerdict &&
    (detail.executionStatus === "PENDING" || detail.executionStatus === "IN_PROGRESS");

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description={`${detail.productName} (${detail.productCode})`}
        meta={<span>가상 데모 데이터</span>}
        title={detail.inspectionNumber}
      />

      <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>
            <h2>검사 개요</h2>
          </CardTitle>
          <CardDescription>적용 규격과 대상, 판정 근거를 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-text-muted">검사 규격</dt>
              <dd className="mt-1 text-sm font-semibold">{detail.specName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">작업지시</dt>
              <dd className="mt-1 font-mono text-sm font-semibold">
                {detail.workOrderNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">생산 LOT / 공정</dt>
              <dd className="mt-1 text-sm">
                <span className="font-mono">{detail.productionLotNumber}</span>
                {` · ${detail.processStepName}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">완료 일시</dt>
              <dd className="mt-1 text-sm">
                {detail.completedAt === null ? (
                  <span className="text-text-muted">—</span>
                ) : (
                  <time className="tabular-nums" dateTime={detail.completedAt}>
                    {formatDateTime(detail.completedAt)}
                  </time>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-text-muted">판정 메모</dt>
              <dd className="mt-1 text-sm">
                {detail.verdictMemo === null || detail.verdictMemo === "" ? (
                  <span className="text-text-muted">기록된 메모가 없습니다.</span>
                ) : (
                  detail.verdictMemo
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canVerdictNow ? (
        <InspectionVerdictPanel
          csrfToken={csrfToken}
          onDone={() => setReloadCount((count) => count + 1)}
          target={{
            inspectionId: detail.id,
            inspectionNumber: detail.inspectionNumber,
            specName: detail.specName,
            productionLotNumber: detail.productionLotNumber,
          }}
        />
      ) : null}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>
            <h3>변경 이력</h3>
          </CardTitle>
          <CardDescription>이 검사의 감사 기록입니다.</CardDescription>
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
    </Main>
  );
}
