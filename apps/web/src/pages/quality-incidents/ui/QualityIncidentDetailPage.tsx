import {
  fetchQualityIncidentDetail,
  QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
  QUALITY_INCIDENT_STATUS_LABELS,
  type QualityIncidentDetail,
} from "@/entities/quality-incident";
import {
  Badge,
  Button,
  ErrorState,
  PageHeading,
  Panel,
  Skeleton,
  type BadgeTone,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main, PageCrumb } from "@/widgets/app-shell";

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
  const { state } = useLoadState<{ detail: QualityIncidentDetail }>(
    qualityIncidentId,
    (signal) => fetchQualityIncidentDetail(qualityIncidentId, signal).then((detail) => ({ detail })),
    "부적합 사건을 불러오지 못했습니다.",
  );

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
          <PageCrumb value={state.detail.incidentNumber} />
          <PageHeading
            back={{ label: "부적합·격리 목록", onClick: onBack }}
            eyebrow="부적합 사건 상세"
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
          />
          <div className="grid gap-4">
            <Panel description="조사·봉쇄·종결 진행 상황" headingLevel="h2" bodyClassName="flex flex-wrap items-center gap-3" title="사건 상태">
                <Badge tone={STATUS_TONES[state.detail.status] ?? "neutral"}>
                  {QUALITY_INCIDENT_STATUS_LABELS[state.detail.status]}
                </Badge>
                <span className="text-sm text-text-muted">
                  {state.detail.description ??
                    "등록된 설명이 없습니다."}
                </span>
              </Panel>
            <Panel description="이 사건에 기록된 최근 감사" headingLevel="h2" title="감사 이력">
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
              </Panel>
          </div>
        </>
      )}
    </Main>
  );
}
