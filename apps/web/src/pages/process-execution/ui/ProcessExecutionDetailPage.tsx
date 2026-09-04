import {
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
} from "@/entities/inspection";
import { useEffect, useState } from "react";
import {
  BLOCKED_REASON_LABELS,
  fetchProcessExecutionDetail,
  PROCESS_READINESS_LABELS,
  type ProcessExecutionDetail,
} from "@/entities/process-execution";
import { ProcessExecutionPanel } from "@/features/process-execution";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  Button,
  ErrorState,
  PageHeading,
  Panel,
  Skeleton,
  type BadgeTone,
} from "@/shared/ui";
import { Main, PageCrumb } from "@/widgets/app-shell";

const READINESS_TONES: Record<string, BadgeTone> = {
  READY: "success",
  IN_PROGRESS: "info",
  COMPLETED: "neutral",
  WAITING: "neutral",
  BLOCKED: "danger",
};

const INSPECTION_STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
};


/** 서버 enum 코드를 사람이 읽는 라벨로. 모르는 코드는 그대로 보여준다(빈칸보다 낫다). */
function labelOf(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code;
}

function formatDateTime(isoDate: string | null): string {
  return isoDate === null
    ? "—"
    : new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoDate));
}

interface ProcessExecutionDetailPageProps {
  stepId: string;
  csrfToken: string;
  canExecute: boolean;
  onBack: () => void;
}

export function ProcessExecutionDetailPage({
  stepId,
  csrfToken,
  canExecute,
  onBack,
}: ProcessExecutionDetailPageProps) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state:
      | { phase: "error"; message: string }
      | { phase: "success"; detail: ProcessExecutionDetail };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProcessExecutionDetail(stepId, controller.signal)
      .then((detail) => {
        setResult({ key: stepId, state: { phase: "success", detail } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: stepId,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "공정 실행 정보를 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [stepId, reloadCount]);

  const state:
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "success"; detail: ProcessExecutionDetail } =
    result !== null && result.key === stepId
      ? result.state
      : { phase: "loading" };

  return (
    <Main id="main-content" tabIndex={-1}>
      {state.phase === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="공정 실행 정보를 불러올 수 없습니다"
          description={state.message}
          action={
            <Button variant="secondary" onClick={onBack}>
              대기열로
            </Button>
          }
        />
      ) : (
        <>
          <PageCrumb value={`${state.detail.workOrderNumber} · ${state.detail.processStepName}`} />
          <PageHeading
            back={{ label: "공정 실행 대기열", onClick: onBack }}
            eyebrow="공정 실행 상세"
            description={`${state.detail.workOrderNumber} ${state.detail.productName} · 계획 ${state.detail.plannedQuantity.toLocaleString("ko-KR")}${state.detail.unit}`}
            meta={
              <span>
                생산 LOT {state.detail.productionLotNumber} · {state.detail.sequence}번 공정
              </span>
            }
            title={state.detail.processStepName}
          />
          <div className="grid gap-4">
            <Panel description={<>시작 {formatDateTime(state.detail.startedAt)} · 완료{" "}
                  {formatDateTime(state.detail.completedAt)}</>} headingLevel="h2" bodyClassName="flex flex-col gap-2" title="실행 상태">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={READINESS_TONES[state.detail.readiness] ?? "neutral"}>
                    {PROCESS_READINESS_LABELS[state.detail.readiness]}
                  </Badge>
                  {state.detail.blockedReasonCodes.map((code) => (
                    <Badge key={code} tone="warning">
                      {labelOf(BLOCKED_REASON_LABELS, code)}
                    </Badge>
                  ))}
                </div>
                {state.detail.completedAt !== null ? (
                  <p className="text-sm">
                    양품{" "}
                    {(state.detail.goodQuantity ?? 0).toLocaleString("ko-KR")}
                    {" · "}불량{" "}
                    {(state.detail.defectQuantity ?? 0).toLocaleString("ko-KR")}
                    {state.detail.executionMemo !== null
                      ? ` · ${state.detail.executionMemo}`
                      : ""}
                  </p>
                ) : null}
              </Panel>
            <Panel description="이 공정에 적용된 검사와 판정" headingLevel="h2" title="공정 검사">
                {state.detail.inspections.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    적용된 검사가 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {state.detail.inspections.map((inspection) => (
                      <li
                        key={inspection.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-sm tabular-nums">
                          {inspection.inspectionNumber}
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge tone={inspection.gate === "LOT_COMPLETE" ? "info" : "neutral"}>{labelOf(INSPECTION_GATE_LABELS, inspection.gate)}</Badge>
                          <Badge
                            tone={INSPECTION_STATUS_TONES[inspection.executionStatus] ?? "neutral"}
                          >
                            {labelOf(INSPECTION_EXECUTION_STATUS_LABELS, inspection.executionStatus)}
                          </Badge>
                          {inspection.verdict !== null ? (
                            <Badge tone={inspection.verdict === "PASS" ? "success" : "danger"}>
                              {labelOf(INSPECTION_VERDICT_LABELS, inspection.verdict)}
                            </Badge>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            {/* 실적 입력은 진행 중인 공정에만 의미가 있다. 차단·대기·완료에서는 이유를 한 줄로 알려준다. */}
            {canExecute && state.detail.readiness !== "IN_PROGRESS" ? (
              <p className="text-sm text-text-muted">
                {PROCESS_READINESS_LABELS[state.detail.readiness]} 상태에서는 완료 실적을 입력할 수
                없습니다. 실행 가능 공정은 대기열에서 시작한 뒤 여기서 실적을 기록합니다.
              </p>
            ) : null}
            {canExecute && state.detail.readiness === "IN_PROGRESS" ? (
              <ProcessExecutionPanel
                csrfToken={csrfToken}
                onDone={() => setReloadCount((count) => count + 1)}
                target={{
                  stepId: state.detail.id,
                  workOrderNumber: state.detail.workOrderNumber,
                  processStepName: state.detail.processStepName,
                  productionLotNumber: state.detail.productionLotNumber,
                  plannedQuantity: state.detail.plannedQuantity,
                }}
              />
            ) : null}
          </div>
        </>
      )}
    </Main>
  );
}
