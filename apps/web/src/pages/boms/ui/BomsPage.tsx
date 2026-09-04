import { useEffect, useMemo, useState } from "react";
import {
  fetchBomRevisions,
  BOM_LIFECYCLE_LABELS,
  type BomLifecycle,
  type BomRevisionListItem,
} from "@/entities/bom";
import { ApiRequestError } from "@/shared/api";
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
import { Main } from "@/widgets/app-shell";
import {
  mergeBomsSearch,
  toBomsParams,
  type BomsSearch,
} from "../model/boms-search";

const LIFECYCLE_TONES: Record<BomLifecycle, BadgeTone> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  INACTIVE: "warning",
};

const PAGE_SIZE = 20;

function formatQuantity(quantity: string): string {
  const value = Number(quantity);
  return Number.isFinite(value)
    ? value.toLocaleString("ko-KR", { maximumFractionDigits: 6 })
    : quantity;
}

function summarizeItems(items: BomRevisionListItem["items"]): string {
  if (items.length === 0) {
    return "항목 없음";
  }
  const head = items[0]!;
  const headText = `${head.materialCode} ×${formatQuantity(head.quantityPerProductBaseUom)}`;
  return items.length === 1 ? headText : `${headText} 외 ${items.length - 1}건`;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: BomRevisionListItem[];
      total: number;
      page: number;
    };

interface BomsPageProps {
  search: BomsSearch;
  onSearchChange: (next: BomsSearch) => void;
}

export function BomsPage({ search, onSearchChange }: BomsPageProps) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state:
      | { phase: "error"; message: string }
      | {
          phase: "success";
          items: BomRevisionListItem[];
          total: number;
          page: number;
        };
  } | null>(null);

  const params = useMemo(() => toBomsParams(search).toString(), [search]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBomRevisions(new URLSearchParams(params), controller.signal)
      .then((response) => {
        setResult({
          key: params,
          reload: reloadCount,
          state: {
            phase: "success",
            items: response.items,
            total: response.total,
            page: response.page,
          },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: params,
          reload: reloadCount,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "BOM 목록을 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [params, reloadCount]);

  const isCurrent =
    result !== null && result.key === params && result.reload === reloadCount;
  // 조건이 바뀌어도 이전 결과가 있으면 그대로 두고 흐리게만 표시한다(스켈레톤 교체 깜빡임 방지).
  const isRefreshing = result !== null && result.state.phase === "success" && !isCurrent;
  const state: LoadState =
    isCurrent || isRefreshing ? result!.state : { phase: "loading" };

  const columns = useMemo<DataTableColumn<BomRevisionListItem>[]>(
    () => [
      {
        key: "revisionNumber",
        header: "Revision",
        cell: (row) => (
          <span className="block">
            <span className="block font-mono text-sm">{row.revisionNumber}</span>
            <span className="block text-xs text-text-muted">
              생성 {new Date(row.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </span>
        ),
      },
      {
        key: "product",
        header: "제품",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm">{row.productName}</span>
            <span className="block font-mono text-xs text-text-muted">
              {row.productCode} · 기준단위 {row.productBaseUom}
            </span>
          </span>
        ),
      },
      {
        key: "lifecycle",
        header: "상태",
        cell: (row) => (
          <Badge tone={LIFECYCLE_TONES[row.lifecycle]}>
            {BOM_LIFECYCLE_LABELS[row.lifecycle]}
          </Badge>
        ),
      },
      {
        key: "items",
        header: "구성 자재",
        cell: (row) => (
          <span className="block text-sm">{summarizeItems(row.items)}</span>
        ),
      },
      {
        key: "itemCount",
        header: "항목 수",
        cell: (row) => <span className="tabular-nums">{row.items.length}</span>,
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined || search.lifecycle !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="발행된 BOM revision과 제품 단위당 소요량을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="BOM 기준정보"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "revision 번호나 제품으로 BOM을 검색합니다."
        }
      >
        <Input
          aria-label="BOM 검색"
          defaultValue={search.q}
          id="bom-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(
                mergeBomsSearch(search, {
                  q: value === "" ? undefined : value,
                  page: undefined,
                }),
              );
            }
          }}
          placeholder="revision 번호·제품 코드·제품명"
        />
        <Select
          label="상태"
          options={[
            { label: "전체 상태", value: "all" },
            ...Object.entries(BOM_LIFECYCLE_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={
            search.lifecycle?.length === 1
              ? (search.lifecycle[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            onSearchChange(
              mergeBomsSearch(search, {
                lifecycle:
                  value === "all" ? undefined : [value as BomLifecycle],
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton label="BOM 목록 조회 중" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="BOM 목록을 불러올 수 없습니다"
          description={state.message}
          action={
            <Button
              variant="secondary"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilter
              ? "조건에 맞는 BOM이 없습니다"
              : "아직 BOM revision이 없습니다"
          }
          description={
            hasActiveFilter
              ? "검색어나 상태 조건을 바꿔보세요."
              : "기준정보가 등록되면 여기에 표시됩니다."
          }
        />
      ) : (
        <DataTable
          busy={isRefreshing}
          caption="BOM revision 목록"
          columns={columns}
          rows={state.items}
          getRowKey={(row) => row.id}
          emptyMessage="조건에 맞는 BOM이 없습니다."
        />
      )}

      {state.phase === "success" ? (
        <Pagination
          currentPage={currentPage}
          label="BOM 페이지 탐색"
          onPageChange={(page) => onSearchChange(mergeBomsSearch(search, { page }))}
          totalPages={totalPages}
        />
      ) : null}
    </Main>
  );
}
