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

const PAGE_SIZE = 20;


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
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as MaterialLotsListSearch;
      return fetchMaterialLots(toMaterialLotsSearchParams(searchValue), signal).then((response) => ({
        items: response.items,
        total: response.total,
        page: response.page,
      }));
    },
    "자재 LOT 목록을 불러오지 못했습니다.",
  );

  const columns = useMemo<DataTableColumn<MaterialLotListItem>[]>(
    () => [
      {
        key: "lotNumber",
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
        wrap: true,
        header: "자재",
        cell: (row) => (
          <span className="block min-w-32">
            <span className="block text-sm text-text-strong">{row.materialName}</span>
            <span className="block text-xs tabular-nums text-text-muted">
              {row.materialCode}
            </span>
          </span>
        ),
      },
      {
        key: "receivedQuantity",
        header: "입고량",
        align: "right",
        cell: (row) => (
          <span className="tabular-nums">
            {row.receivedQuantity.toLocaleString("ko-KR")} {row.unit}
          </span>
        ),
      },
      {
        key: "onHand",
        header: "재고",
        align: "right",
        cell: (row) => (
          <span className="tabular-nums">{row.onHand.toLocaleString("ko-KR")}</span>
        ),
      },
      {
        key: "reservedQuantity",
        header: "예약",
        align: "right",
        cell: (row) => (
          <span className="tabular-nums">
            {row.reservedQuantity.toLocaleString("ko-KR")}
          </span>
        ),
      },
      {
        key: "availableQuantity",
        header: "가용",
        align: "right",
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
        header: "품질 상태",
        cell: (row) => (
          <Badge tone={DISPOSITION_TONES[row.qualityDisposition] ?? "neutral"}>
            {MATERIAL_LOT_DISPOSITION_LABELS[row.qualityDisposition]}
          </Badge>
        ),
      },
      {
        key: "expiresAt",
        header: "유효기간",
        cell: (row) => <ExpiryCell expiresAt={row.expiresAt} />,
      },
      ...(canDecideQuality
        ? [
            {
              key: "actions",
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

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="자재 LOT 재고와 예약·가용량·품질 통제 상태를 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="자재 LOT"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (최근 입고 순서)`
            : "조회 조건을 선택하면 자재 LOT를 확인합니다."
        }
      >
        <Input
          aria-label="자재 LOT 검색"
          defaultValue={search.q}
          id="material-lot-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(mergeMaterialLotsSearch(search, {q: value === "" ? undefined : value,
                page: undefined,}));
            }
          }}
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
            search.disposition?.length === 1
              ? (search.disposition[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            onSearchChange(mergeMaterialLotsSearch(search, {disposition:
                value === "all"
                  ? undefined
                  : [
                      value as (typeof MATERIAL_LOT_DISPOSITIONS)[number],
                    ],
              page: undefined,}))
          }
        />
        <Select
          label="가용성"
          options={Object.entries(MATERIAL_LOT_AVAILABILITY_OPTIONS).map(
            ([value, label]) => ({ label, value }),
          )}
          value={search.availability ?? "all"}
          onValueChange={(value) =>
            onSearchChange(mergeMaterialLotsSearch(search, {availability:
                value === "all"
                  ? undefined
                  : (value as keyof typeof MATERIAL_LOT_AVAILABILITY_OPTIONS),
              page: undefined,}))
          }
        />
        {hasActiveFilter ? (
          <Button variant="ghost" onClick={() => onSearchChange({})}>
            조건 초기화
          </Button>
        ) : null}
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton label="자재 LOT 조회 중" />
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={
            <Button onClick={() => reload()}>
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 자재 LOT가 없습니다"
          description="조회 조건을 초기화하거나 다른 조건으로 확인해 주세요."
          action={
            hasActiveFilter ? (
              <Button variant="secondary" onClick={() => onSearchChange({})}>
                조건 초기화
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
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
          <DataTable
            onRowClick={(row) => onOpenDetail(row.id)}
            busy={isRefreshing}
            caption="자재 LOT 목록"
            columns={columns}
            emptyMessage="조건에 맞는 자재 LOT가 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <Pagination
            currentPage={currentPage}
            label="자재 LOT 페이지 탐색"
            onPageChange={(page) => onSearchChange(mergeMaterialLotsSearch(search, { page }))}
            totalPages={totalPages}
          />
        </>
      )}
    </Main>
  );
}
