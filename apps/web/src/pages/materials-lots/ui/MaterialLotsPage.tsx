import { applyListSort } from "@/shared/lib";
import { getPageSize } from "@/shared/lib";
import { useMemo, useState } from "react";
import {
  daysUntil,
  fetchMaterialLots,
  formatMaterialLotDate,
  MATERIAL_LOT_AVAILABILITY_OPTIONS,
  MATERIAL_LOT_DISPOSITIONS,
  MATERIAL_LOT_DISPOSITION_LABELS,
  type MaterialLotListItem,
} from "@/entities/material-lot";
import {
  MaterialLotDispositionPanel,
  type MaterialLotDispositionTarget,
} from "@/features/material-lot-disposition";
import {
  ActionSheet,
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
  mergeMaterialLotsSearch,
  toMaterialLotsSearchParams,
  type MaterialLotsListSearch,
} from "../model/material-lots-search";

const DISPOSITION_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  ACCEPTED: "success",
  HOLD: "warning",
  QUARANTINED: "danger",
  REJECTED: "neutral",
};

interface MaterialLotsPageProps {
  search: MaterialLotsListSearch;
  onSearchChange: (next: MaterialLotsListSearch) => void;
  onOpenDetail: (materialLotId: string) => void;
  csrfToken: string;
  canDecideQuality: boolean;
}

function ExpiryCell({ expiresAt }: { expiresAt: string | null }) {
  if (expiresAt === null) {
    return <span className="text-text-subtle">제한 없음</span>;
  }
  const remaining = daysUntil(expiresAt);
  const label = formatMaterialLotDate(expiresAt);
  if (remaining < 0) {
    return <Badge tone="danger">{`${label} 만료`}</Badge>;
  }
  if (remaining <= 7) {
    return <Badge tone="warning">{`${label} (D-${remaining})`}</Badge>;
  }
  return (
    <time
      className="tabular-nums text-text-muted"
      dateTime={new Date(expiresAt).toISOString()}
    >
      {label}
    </time>
  );
}

export function MaterialLotsPage({
  search,
  onSearchChange,
  onOpenDetail,
  csrfToken,
  canDecideQuality,
}: MaterialLotsPageProps) {
  const searchKey = JSON.stringify(search);
  const [dispositionTarget, setDispositionTarget] =
    useState<MaterialLotDispositionTarget | null>(null);
  const { state, isRefreshing, reload } = useLoadState<{
    items: MaterialLotListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as MaterialLotsListSearch;
      return fetchMaterialLots(
        toMaterialLotsSearchParams(searchValue),
        signal,
      ).then((response) => ({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      }));
    },
    "자재 LOT 목록을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<MaterialLotListItem>[]>(
    () => [
      {
        key: "lotNumber",
        width: 150,
        sortKey: "lotNumber",
        align: "left",
        header: "자재 LOT",
        cell: (row) => (
          <button
            className="text-sm font-semibold tabular-nums text-accent-strong underline-offset-4 hover:underline"
            onClick={() => onOpenDetail(row.id)}
            type="button"
          >
            {row.lotNumber}
          </button>
        ),
      },
      {
        key: "material",
        width: 224,
        align: "left",
        header: "자재",
        cell: (row) => (
          <span className="block min-w-32">
            <span className="block text-sm text-text-strong">
              {row.materialName}
            </span>
            <span className="block text-xs tabular-nums text-text-muted">
              {row.materialCode}
            </span>
          </span>
        ),
      },
      {
        key: "receivedQuantity",
        width: 80,
        align: "center",
        header: "입고량",

        cell: (row) => (
          <span className="tabular-nums">
            {row.receivedQuantity.toLocaleString("ko-KR")} {row.unit}
          </span>
        ),
      },
      {
        key: "onHand",
        width: 80,
        sortKey: "onHand",
        align: "center",
        header: "재고",

        cell: (row) => (
          <span className="tabular-nums">
            {row.onHand.toLocaleString("ko-KR")}
          </span>
        ),
      },
      {
        key: "reservedQuantity",
        width: 80,
        align: "center",
        header: "예약",

        cell: (row) => (
          <span className="tabular-nums">
            {row.reservedQuantity.toLocaleString("ko-KR")}
          </span>
        ),
      },
      {
        key: "availableQuantity",
        width: 88,
        align: "center",
        header: "가용",

        cell: (row) =>
          row.availableQuantity === 0 ? (
            <Badge tone="danger">0</Badge>
          ) : (
            <span className="tabular-nums font-semibold text-text-strong">
              {row.availableQuantity.toLocaleString("ko-KR")}
            </span>
          ),
      },
      {
        key: "qualityDisposition",
        width: 104,
        align: "center",
        header: "품질 상태",
        cell: (row) => (
          <Badge tone={DISPOSITION_TONES[row.qualityDisposition] ?? "neutral"}>
            {MATERIAL_LOT_DISPOSITION_LABELS[row.qualityDisposition]}
          </Badge>
        ),
      },
      {
        key: "expiresAt",
        width: 136,
        sortKey: "expiresAt",
        align: "center",
        header: "유효기간",
        cell: (row) => <ExpiryCell expiresAt={row.expiresAt} />,
      },
      ...(canDecideQuality
        ? [
            {
              key: "actions",
              width: 120,
              align: "center",
              header: "행동",
              cell: (row: MaterialLotListItem) =>
                row.qualityDisposition === "PENDING" ||
                row.qualityDisposition === "HOLD" ||
                row.qualityDisposition === "QUARANTINED" ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setDispositionTarget({
                        lotId: row.id,
                        lotNumber: row.lotNumber,
                        materialName: row.materialName,
                        currentDisposition: row.qualityDisposition,
                        onHand: row.onHand,
                        unit: row.unit,
                      })
                    }
                  >
                    품질 처분
                  </Button>
                ) : (
                  <span className="text-text-subtle">—</span>
                ),
            } satisfies DataTableColumn<MaterialLotListItem>,
          ]
        : []),
    ],
    [canDecideQuality, onOpenDetail],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.disposition !== undefined ||
    search.availability !== undefined;

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
          mergeMaterialLotsSearch(search, {
            pageSize: size === 10 ? undefined : size,
            page: undefined,
          }),
        )
      }

      label="자재 LOT 페이지 탐색"
      onPageChange={(page) =>
        onSearchChange(mergeMaterialLotsSearch(search, { page }))
      }
      totalPages={totalPages}
    />
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="자재 LOT 재고와 예약·가용량·품질 통제 상태를 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="자재 LOT"
      />

      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "조회 조건을 선택하면 자재 LOT를 확인합니다."
        }
      >
        <Input
          data-tour="list-search"
          aria-label="자재 LOT 검색"
          value={draft.q ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, q: event.target.value })
          }
          id="material-lot-q"
          label="검색"
          name="q"
          placeholder="LOT 번호·자재"
        />
        <Select
          label="품질 상태"
          options={[
            { label: "전체 품질 상태", value: "all" },
            ...MATERIAL_LOT_DISPOSITIONS.map((disposition) => ({
              label: MATERIAL_LOT_DISPOSITION_LABELS[disposition],
              value: disposition,
            })),
          ]}
          value={
            draft.disposition?.length === 1
              ? (draft.disposition[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeMaterialLotsSearch(draft, {
                disposition:
                  value === "all"
                    ? undefined
                    : [value as (typeof MATERIAL_LOT_DISPOSITIONS)[number]],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="가용성"
          options={Object.entries(MATERIAL_LOT_AVAILABILITY_OPTIONS).map(
            ([value, label]) => ({ label, value }),
          )}
          value={draft.availability ?? "all"}
          onValueChange={(value) =>
            setDraft(
              mergeMaterialLotsSearch(draft, {
                availability:
                  value === "all"
                    ? undefined
                    : (value as keyof typeof MATERIAL_LOT_AVAILABILITY_OPTIONS),
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      <>
        <ActionSheet
          open={dispositionTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDispositionTarget(null);
          }}
          title="자재 LOT 품질 처분"
          description="선택한 자재의 품질 상태와 처분 영향을 확인하세요."
        >
          {dispositionTarget !== null ? (
            <MaterialLotDispositionPanel
              csrfToken={csrfToken}
              onDone={() => {
                setDispositionTarget(null);
                reload();
              }}
              target={dispositionTarget}
            />
          ) : null}
        </ActionSheet>
        <DataTable
          loading={state.phase === "loading"}
          loadingLabel="자재 LOT 조회 중"
          loadingRows={pageSize}
          minimumRows={pageSize}
          emptyContent={
            state.phase === "error" ? (
              <ErrorState
                description={state.message}
                action={<Button onClick={() => reload()}>다시 시도</Button>}
              />
            ) : (
              <EmptyState
                title="조건에 맞는 자재 LOT가 없습니다"
                description="조회 조건을 초기화하거나 다른 조건으로 확인해 주세요."
                action={
                  hasActiveFilter ? (
                    <Button variant="secondary" onClick={reset}>
                      조건 초기화
                    </Button>
                  ) : undefined
                }
              />
            )
          }
          sort={search}
          onSortChange={(next) =>
            onSearchChange(applyListSort(search, next))
          }
          footer={pagination}
          rowNumberStart={
            (state.phase === "success" ? state.total : 0) -
            (currentPage - 1) * pageSize
          }
          onRowClick={(row) => onOpenDetail(row.id)}
          busy={isRefreshing}
          caption="자재 LOT 목록"
          columns={columns}
          emptyMessage="조건에 맞는 자재 LOT가 없습니다."
          getRowKey={(row) => row.id}
          tourRecord="material-lot"
          rows={state.phase === "success" ? state.items : []}
        />
      </>
    </Main>
  );
}
