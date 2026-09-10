import { getPageSize } from "@/shared/lib";
import { useMemo } from "react";
import {
  fetchBomRevisions,
  BOM_LIFECYCLE_LABELS,
  type BomLifecycle,
  type BomRevisionListItem,
} from "@/entities/bom";
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
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
import { useLoadState, useQueryDraft } from "@/shared/lib";
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

interface BomsPageProps {
  search: BomsSearch;
  onSearchChange: (next: BomsSearch) => void;
}

export function BomsPage({ search, onSearchChange }: BomsPageProps) {
  const params = useMemo(() => toBomsParams(search).toString(), [search]);

  const { state, isRefreshing, reload } = useLoadState<{
    items: BomRevisionListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    params,
    (signal) => {
      return fetchBomRevisions(new URLSearchParams(params), signal).then(
        (response) => ({
          items: response.items,
          total: response.total,
          page: response.page,
          pageSize: response.pageSize,
        }),
      );
    },
    "BOM 목록을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<BomRevisionListItem>[]>(
    () => [
      {
        key: "revisionNumber",
        width: 170,
        sortKey: "revisionNumber",
        align: "left",
        header: "Revision",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm tabular-nums">
              {row.revisionNumber}
            </span>
            <span className="block text-xs text-text-muted">
              생성 {new Date(row.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </span>
        ),
      },
      {
        key: "product",
        width: 260,
        sortKey: "productName",
        align: "left",
        header: "제품",
        cell: (row) => (
          <span className="block">
            <span className="block min-w-48 max-w-72 text-sm font-medium leading-5 text-text-strong">
              {row.productName}
            </span>
            <span className="block text-xs tabular-nums text-text-muted">
              {row.productCode} · 기준단위 {row.productBaseUom}
            </span>
          </span>
        ),
      },
      {
        key: "lifecycle",
        width: 112,
        align: "center",
        header: "상태",
        cell: (row) => (
          <Badge tone={LIFECYCLE_TONES[row.lifecycle]}>
            {BOM_LIFECYCLE_LABELS[row.lifecycle]}
          </Badge>
        ),
      },
      {
        key: "items",
        width: 340,
        align: "left",
        header: "구성 자재",
        cell: (row) => (
          <span className="block text-sm">{summarizeItems(row.items)}</span>
        ),
      },
      {
        key: "itemCount",
        width: 112,
        sortKey: "itemCount",
        align: "center",
        header: "항목 수",
        cell: (row) => <span className="tabular-nums">{row.items.length}</span>,
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined || search.lifecycle !== undefined;

  const pageSize =
    state.phase === "success" ? state.pageSize : getPageSize(search.pageSize);
  const currentPage =
    state.phase === "success" ? state.page : (search.page ?? 1);
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / pageSize))
      : 1;

  const pagination = (
    <Pagination
      loading={state.phase === "loading"}
      busy={state.phase === "loading" || isRefreshing}
      currentPage={currentPage}
      totalItems={state.phase === "success" ? state.total : 0}
      pageSize={pageSize}
      onPageSizeChange={(size) =>
        onSearchChange(
          mergeBomsSearch(search, {
            pageSize: size === 10 ? undefined : size,
            page: undefined,
          }),
        )
      }

      label="BOM 페이지 탐색"
      onPageChange={(page) =>
        onSearchChange(mergeBomsSearch(search, { page }))
      }
      totalPages={totalPages}
    />
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="발행된 BOM revision과 제품 단위당 소요량을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="BOM 기준정보"
      />

      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "revision 번호나 제품으로 BOM을 검색합니다."
        }
      >
        <Input
          aria-label="BOM 검색"
          value={draft.q ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, q: event.target.value })
          }
          id="bom-q"
          label="검색"
          name="q"
          placeholder="revision 번호·제품 코드·제품명"
        />
        <Select
          label="상태"
          options={[
            { label: "전체 상태", value: "all" },
            ...Object.entries(BOM_LIFECYCLE_LABELS).map(
              ([value, label]) => ({
                label,
                value,
              }),
            ),
          ]}
          value={
            draft.lifecycle?.length === 1
              ? (draft.lifecycle[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeBomsSearch(draft, {
                lifecycle:
                  value === "all" ? undefined : [value as BomLifecycle],
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      <DataTable
        loading={state.phase === "loading"}
        loadingLabel="BOM 목록 조회 중"
        loadingRows={pageSize}
        minimumRows={pageSize}
        emptyContent={
          state.phase === "error" ? (
            <ErrorState
              title="BOM 목록을 불러올 수 없습니다"
              description={state.message}
              action={
                <Button variant="secondary" onClick={() => reload()}>
                  다시 시도
                </Button>
              }
            />
          ) : (
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
          )
        }
        sort={{
          sort: search.sort ?? "createdAt",
          order: search.order ?? "desc",
        }}
        onSortChange={(next) =>
          onSearchChange({ ...search, ...next, page: 1 })
        }
        footer={pagination}
        rowNumberStart={
          (state.phase === "success" ? state.total : 0) -
          (currentPage - 1) * pageSize
        }
        busy={isRefreshing}
        caption="BOM revision 목록"
        columns={columns}
        rows={state.phase === "success" ? state.items : []}
        getRowKey={(row) => row.id}
        emptyMessage="조건에 맞는 BOM이 없습니다."
      />
    </Main>
  );
}
