import { useEffect, useState } from "react";
import {
  fetchTraceNodeDetail,
  LOT_RELATION_TYPE_LABELS,
  TRACE_NODE_TYPE_LABELS,
  type TraceEdgeView,
  type TraceNodeDetail,
} from "@/entities/trace-node";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  PageHeading,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

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

interface TraceNodeDetailPageProps {
  traceNodeId: string;
  onBack: () => void;
}

function EdgeList({
  title,
  description,
  edges,
  emptyText,
}: {
  title: string;
  description: string;
  edges: TraceEdgeView[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {edges.length === 0 ? (
          <p className="text-sm text-text-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {edges.map((edge) => (
              <li
                key={edge.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-mono text-sm">{edge.node.label}</p>
                  <p className="text-xs text-text-muted">
                    {TRACE_NODE_TYPE_LABELS[edge.node.nodeType]} · 기록{" "}
                    {formatDateTime(edge.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{LOT_RELATION_TYPE_LABELS[edge.relationType]}</Badge>
                  <span className="tabular-nums text-sm font-medium">
                    {edge.quantity.toLocaleString("ko-KR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TraceNodeDetailPage({
  traceNodeId,
  onBack,
}: TraceNodeDetailPageProps) {
  const [result, setResult] = useState<{
    key: string;
    state: { phase: "error"; message: string } | { phase: "success"; detail: TraceNodeDetail };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchTraceNodeDetail(traceNodeId, controller.signal)
      .then((detail) => {
        setResult({ key: traceNodeId, state: { phase: "success", detail } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: traceNodeId,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "추적 노드를 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [traceNodeId]);

  const state:
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "success"; detail: TraceNodeDetail } =
    result !== null && result.key === traceNodeId
      ? result.state
      : { phase: "loading" };

  return (
    <Main id="main-content" tabIndex={-1}>
      {state.phase === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="추적 노드를 불러올 수 없습니다"
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
            description="이 노드로 투입된 원천과 이 노드가 투입된 산출을 확인합니다."
            meta={<span>가상 데모 데이터</span>}
            title={`${TRACE_NODE_TYPE_LABELS[state.detail.nodeType]} ${state.detail.label}`}
            actions={
              <Button variant="secondary" onClick={onBack}>
                목록으로
              </Button>
            }
          />
          <div className="mt-2">
            <EmptyState
              title={`생성 ${formatDateTime(state.detail.createdAt)}`}
              description="CONSUME 관계는 공정 시작 시점에 자동으로 기록됩니다."
            />
          </div>
          <div className="mt-4 grid gap-4">
            <EdgeList
              title="원천 (upstream)"
              description="이 LOT를 만들기 위해 투입된 자재"
              edges={state.detail.upstream}
              emptyText="투입 기록이 없습니다."
            />
            <EdgeList
              title="영향 (downstream)"
              description="이 LOT가 투입된 생산 LOT"
              edges={state.detail.downstream}
              emptyText="투입된 산출 기록이 없습니다."
            />
          </div>
        </>
      )}
    </Main>
  );
}
