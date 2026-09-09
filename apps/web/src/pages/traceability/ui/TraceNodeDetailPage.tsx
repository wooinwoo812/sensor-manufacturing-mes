import {
  fetchTraceNodeDetail,
  LOT_RELATION_TYPE_LABELS,
  TRACE_NODE_TYPE_LABELS,
  type TraceEdgeView,
  type TraceNodeDetail,
} from "@/entities/trace-node";
import {
  Badge,
  Button,
  ErrorState,
  FormActions,
  PageHeading,
  Panel,
  ContentGrid,
  StatusStrip,
  Skeleton,
  DataRegion,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main, PageCrumb } from "@/widgets/app-shell";

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
  /** 목록 항목의 노드를 눌러 그 노드의 계보로 이동한다. 계보는 노드에서 노드로 따라가는 화면이다. */
  onOpenNode?: ((traceNodeId: string) => void) | undefined;
}

function EdgeList({
  tourAnchor,
  title,
  description,
  edges,
  emptyText,
  onOpenNode,
}: {
  tourAnchor: string;
  title: string;
  description: string;
  edges: TraceEdgeView[];
  emptyText: string;
  onOpenNode?: ((traceNodeId: string) => void) | undefined;
}) {
  return (
    <Panel
      tourAnchor={tourAnchor}
      description={description}
      headingLevel="h2"
      title={title}
    >
      {edges.length === 0 ? (
        <p className="py-1 text-sm text-text-muted">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {edges.map((edge) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              key={edge.id}
            >
              <div className="min-w-0">
                {onOpenNode ? (
                  <button
                    className="text-sm font-semibold tabular-nums text-accent-strong underline-offset-4 hover:underline"
                    onClick={() => onOpenNode(edge.node.id)}
                    type="button"
                  >
                    {edge.node.label}
                  </button>
                ) : (
                  <span className="text-sm font-semibold tabular-nums">
                    {edge.node.label}
                  </span>
                )}
                <p className="mt-0.5 text-xs text-text-muted">
                  {TRACE_NODE_TYPE_LABELS[edge.node.nodeType]} ·{" "}
                  {formatDateTime(edge.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone="info">
                  {LOT_RELATION_TYPE_LABELS[edge.relationType]}
                </Badge>
                <span className="text-sm tabular-nums">
                  <span className="text-text-muted">수량 </span>
                  <strong className="font-semibold">
                    {edge.quantity.toLocaleString("ko-KR")}
                  </strong>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function TraceNodeDetailPage({
  traceNodeId,
  onBack,
  onOpenNode,
}: TraceNodeDetailPageProps) {
  const { state } = useLoadState<{ detail: TraceNodeDetail }>(
    traceNodeId,
    (signal) =>
      fetchTraceNodeDetail(traceNodeId, signal).then((detail) => ({ detail })),
    "추적 노드를 불러오지 못했습니다.",
  );
  const detail = state.phase === "success" ? state.detail : null;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        back={{ label: "LOT 계보 목록", onClick: onBack }}
        eyebrow="LOT 계보 상세"
        title={detail?.label ?? "LOT 계보"}
        description={
          detail
            ? "이 노드로 투입된 원천과 이 노드가 투입된 산출을 양방향으로 확인합니다."
            : state.phase === "loading"
              ? "상세 정보를 불러오고 있습니다."
              : "상세 정보를 확인하지 못했습니다. 다시 시도하거나 이전 화면으로 돌아가세요."
        }
        meta={
          detail ? (
            <span>생성 {formatDateTime(detail.createdAt)}</span>
          ) : undefined
        }
      />
      <DataRegion name="detail" loading={state.phase === "loading"}>
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
            <PageCrumb value={state.detail.label} />
            {/* 다른 상세와 같은 자리: 제목 아래 배지 행. 노드 종류는 eyebrow 문장이 아니라 배지로 보여준다. */}
            <StatusStrip>
              <Badge tone="info">
                {TRACE_NODE_TYPE_LABELS[state.detail.nodeType]}
              </Badge>
              <span className="text-xs text-text-muted">
                자재 소비 관계는 공정 시작 시점에 자동으로 기록됩니다.
              </span>
            </StatusStrip>
            {/* 원천 → 이 노드 → 영향. 흐름의 양쪽이므로 나란히 둔다. */}
            <ContentGrid>
              <EdgeList
                description="이 노드를 만들기 위해 투입된 자재·LOT"
                edges={state.detail.upstream}
                emptyText="투입 기록이 없습니다."
                onOpenNode={onOpenNode}
                title="원천 (upstream)"
                tourAnchor="trace-upstream"
              />
              <EdgeList
                description="이 노드가 투입된 생산 LOT·완제품"
                edges={state.detail.downstream}
                emptyText="투입된 산출 기록이 없습니다."
                onOpenNode={onOpenNode}
                title="영향 (downstream)"
                tourAnchor="trace-downstream"
              />
            </ContentGrid>
            <FormActions>
              <Button variant="secondary" onClick={onBack}>
                목록으로
              </Button>
            </FormActions>
          </>
        )}
      </DataRegion>
    </Main>
  );
}
