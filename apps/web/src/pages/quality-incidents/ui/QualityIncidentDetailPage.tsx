import { useEffect, useState } from "react";
import {
  fetchQualityIncidentDetail,
  QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
  QUALITY_INCIDENT_STATUS_LABELS,
  type QualityIncidentDetail,
} from "@/entities/quality-incident";
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

const STATUS_TONES: Record<string, BadgeTone> = {
  OPEN: "danger",
  ASSESSED: "warning",
  CONTAINED: "info",
  CLOSED: "success",
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

interface QualityIncidentDetailPageProps {
  qualityIncidentId: string;
  onBack: () => void;
}

export function QualityIncidentDetailPage({
  qualityIncidentId,
  onBack,
}: QualityIncidentDetailPageProps) {
  const [result, setResult] = useState<{
    key: string;
    state:
      | { phase: "error"; message: string }
      | { phase: "success"; detail: QualityIncidentDetail };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchQualityIncidentDetail(qualityIncidentId, controller.signal)
      .then((detail) => {
        setResult({ key: qualityIncidentId, state: { phase: "success", detail } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: qualityIncidentId,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "부적합 사건을 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [qualityIncidentId]);

  const state:
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "success"; detail: QualityIncidentDetail } =
    result !== null && result.key === qualityIncidentId
      ? result.state
      : { phase: "loading" };

  return (
    <Main id="main-content" tabIndex={-1}>
      {state.phase === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="부적합 사건을 불러올 수 없습니다"
          description={state.message}
          action={
            <Button variant="secondary" onClick={onBack}>
              목록으로
            </Button>
          }
        />
      ) : (
        <>
          <PageHeading
            description={`${QUALITY_INCIDENT_SOURCE_TYPE_LABELS[state.detail.sourceType]} ${state.detail.sourceLotNumber}에서 발견된 부적합 사건입니다.`}
            meta={
              <span>
                발견 {formatDateTime(state.detail.detectedAt)}
                {state.detail.resolvedAt !== null
                  ? ` · 종결 ${formatDateTime(state.detail.resolvedAt)}`
                  : ""}
              </span>
            }
            title={`${state.detail.incidentNumber} ${state.detail.title}`}
            actions={
              <Button variant="secondary" onClick={onBack}>
                목록으로
              </Button>
            }
          />
          <div className="mt-2 grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>사건 상태</CardTitle>
                <CardDescription>조사·봉쇄·종결 진행 상황</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Badge tone={STATUS_TONES[state.detail.status] ?? "neutral"}>
                  {QUALITY_INCIDENT_STATUS_LABELS[state.detail.status]}
                </Badge>
                <span className="text-sm text-text-muted">
                  {state.detail.description ??
                    "등록된 설명이 없습니다."}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>감사 이력</CardTitle>
                <CardDescription>이 사건에 기록된 최근 감사</CardDescription>
              </CardHeader>
              <CardContent>
                {state.detail.audits.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    기록된 감사가 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {state.detail.audits.map((audit) => (
                      <li key={audit.id} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-sm">{audit.summary}</p>
                        <p className="text-xs text-text-muted">
                          {audit.actorName} · {formatDateTime(audit.occurredAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </Main>
  );
}
