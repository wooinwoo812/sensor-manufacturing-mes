import { useMemo } from "react";
import {
  fetchTraceNodes,
  TRACE_NODE_TYPE_LABELS,
  type TraceNodeListItem,
  type TraceNodeType,
} from "@/entities/trace-node";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  PageHeading,
  Pagination,
  Select,
  TableSkeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";
import {
  mergeTraceabilitySearch,
  toTraceabilityParams,
  type TraceabilitySearch,
} from "../model/traceability-search";

const NODE_TYPE_TONES: Record<TraceNodeType, BadgeTone> = {
  MATERIAL_LOT: "info",
  PRODUCTION_LOT: "success",
  FINISHED_UNIT: "warning",
};

const PAGE_SIZE = 20;


interface TraceabilityPageProps {
  search: TraceabilitySearch;
  onSearchChange: (next: TraceabilitySearch) => void;
  onOpenDetail: (traceNodeId: string) => void;
}

export function TraceabilityPage({
  search,
  onSearchChange,
  onOpenDetail,
}: TraceabilityPageProps) {
  const params = useMemo(
    () => toTraceabilityParams(search).toString(),
    [search],
  );

  const { state, isRefreshing, reload } = useLoadState<{
    items: TraceNodeListItem[];
    total: number;
    page: number;
  }>(
    params,
    (signal) => {
      return fetchTraceNodes(new URLSearchParams(params), signal).then((response) => ({
        items: response.items,
        total: response.total,
        page: response.page,
      }));
    },
    "추적 노드를 불러오지 못했습니다.",
  );

  const columns = useMemo<DataTableColumn<TraceNodeListItem>[]>(
    () => [
      {
        key: "label",
        wrap: true,
        header: "LOT 식별",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm tabular-nums">{row.label}</span>
            <span className="block text-xs text-text-muted">
              생성 {new Date(row.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </span>
        ),
      },
      {
        key: "nodeType",
        header: "구분",
        cell: (row) => (
          <Badge tone={NODE_TYPE_TONES[row.nodeType]}>
            {TRACE_NODE_TYPE_LABELS[row.nodeType]}
          </Badge>
        ),
      },
      {
        key: "upstreamCount",
        header: "원천 (투입)",
        cell: (row) => (
          <span className="tabular-nums">{row.upstreamCount}</span>
        ),
      },
      {
        key: "downstreamCount",
        header: "영향 (산출)",
        cell: (row) => (
          <span className="tabular-nums">{row.downstreamCount}</span>
        ),
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined || search.nodeType !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="자재 LOT과 생산 LOT의 투입 관계를 추적합니다."
        meta={<span>가상 데모 데이터</span>}
        title="LOT 계보"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "LOT 번호로 추적 노드를 검색합니다."
        }
      >
        <Input
          aria-label="추적 노드 검색"
          defaultValue={search.q}
          id="trace-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(
                mergeTraceabilitySearch(search, {
                  q: value === "" ? undefined : value,
                  page: undefined,
                }),
              );
            }
          }}
          placeholder="LOT 번호 (예: ML-2026-0331)"
        />
        <Select
          label="구분"
          options={[
            { label: "전체 구분", value: "all" },
            ...Object.entries(TRACE_NODE_TYPE_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={
            search.nodeType?.length === 1 ? (search.nodeType[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            onSearchChange(
              mergeTraceabilitySearch(search, {
                nodeType:
                  value === "all"
                    ? undefined
                    : [value as TraceNodeType],
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton label="추적 노드 조회 중" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="추적 노드를 불러올 수 없습니다"
          description={state.message}
          action={
            <Button
              variant="secondary"
              onClick={() => reload()}
            >
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilter
              ? "조건에 맞는 추적 노드가 없습니다"
              : "아직 추적 노드가 없습니다"
          }
          description={
            hasActiveFilter
              ? "검색어나 구분 조건을 바꿔보세요."
              : "공정을 시작하면 투입 자재의 계보가 기록됩니다."
          }
        />
      ) : (
        <DataTable
          onRowClick={(row) => onOpenDetail(row.id)}
          busy={isRefreshing}
          caption="추적 노드 목록"
          columns={columns}
          rows={state.items}
          getRowKey={(row) => row.id}
          emptyMessage="조건에 맞는 추적 노드가 없습니다."
        />
      )}

      {state.phase === "success" ? (
        <Pagination
          currentPage={currentPage}
          label="추적 노드 페이지 탐색"
          onPageChange={(page) => onSearchChange(mergeTraceabilitySearch(search, { page }))}
          totalPages={totalPages}
        />
      ) : null}
    </Main>
  );
}
