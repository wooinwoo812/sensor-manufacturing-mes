import { getPageSize } from "@/shared/lib";
import { useMemo, useState } from "react";
import {
  fetchInspections,
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
  type InspectionListItem,
} from "@/entities/inspection";
import { InspectionVerdictPanel } from "@/features/inspection-verdict";
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
  mergeInspectionsSearch,
  toInspectionsParams,
  type InspectionsSearch,
} from "../model/inspections-search";

const EXECUTION_TONES: Record<string, BadgeTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const VERDICT_TONES: Record<string, BadgeTone> = {
  PASS: "success",
  FAIL: "danger",
  HOLD: "warning",
};

interface InspectionsPageProps {
  search: InspectionsSearch;
  onSearchChange: (next: InspectionsSearch) => void;
  onOpenDetail: (inspectionId: string) => void;
  csrfToken: string;
  canVerdict: boolean;
}

export function InspectionsPage({
  search,
  onSearchChange,
  onOpenDetail,
  csrfToken,
  canVerdict,
}: InspectionsPageProps) {
  const searchKey = JSON.stringify(search);
  const [verdictTarget, setVerdictTarget] = useState<InspectionListItem | null>(
    null,
  );
  const { state, isRefreshing, reload } = useLoadState<{
    items: InspectionListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as InspectionsSearch;
      return fetchInspections(toInspectionsParams(searchValue), signal).then(
        (response) => ({
          items: response.items,
          total: response.total,
          page: response.page,
          pageSize: response.pageSize,
        }),
      );
    },
    "검사 목록을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<InspectionListItem>[]>(
    () => [
      {
        key: "inspectionNumber",
        width: 144,
        sortKey: "inspectionNumber",
        align: "left",
        header: "검사",
        cell: (row) => (
          <button
            className="text-sm font-semibold tabular-nums text-accent-strong underline-offset-4 hover:underline"
            onClick={() => onOpenDetail(row.id)}
            type="button"
          >
            {row.inspectionNumber}
          </button>
        ),
      },
      {
        key: "productionLotNumber",
        width: 160,
        align: "left",
        header: "생산 LOT",
        cell: (row) => (
          <span className="text-xs tabular-nums text-text-muted">
            {row.productionLotNumber}
          </span>
        ),
      },
      {
        key: "processStepName",
        width: 104,
        align: "left",
        header: "공정",
        cell: (row) => row.processStepName,
      },
      {
        key: "gate",
        width: 104,
        align: "center",
        header: "게이트",
        cell: (row) => (
          <Badge tone={row.gate === "LOT_COMPLETE" ? "info" : "neutral"}>
            {INSPECTION_GATE_LABELS[row.gate]}
          </Badge>
        ),
      },
      {
        key: "specName",
        width: 176,
        align: "left",
        header: "검사 규격",
        cell: (row) => (
          <span className="block min-w-40 text-sm text-text-strong">
            {row.specName}
          </span>
        ),
      },
      {
        key: "workOrderNumber",
        width: 128,
        align: "left",
        header: "작업지시",
        cell: (row) => (
          <span className="text-xs tabular-nums text-text-muted">
            {row.workOrderNumber}
          </span>
        ),
      },
      {
        key: "executionStatus",
        width: 104,
        align: "center",
        header: "실행 상태",
        cell: (row) => (
          <Badge tone={EXECUTION_TONES[row.executionStatus] ?? "neutral"}>
            {INSPECTION_EXECUTION_STATUS_LABELS[row.executionStatus]}
          </Badge>
        ),
      },
      {
        key: "verdict",
        width: 88,
        align: "center",
        header: "판정",
        cell: (row) =>
          row.verdict === null ? (
            <Badge tone="neutral">미판정</Badge>
          ) : (
            <Badge tone={VERDICT_TONES[row.verdict] ?? "neutral"}>
              {INSPECTION_VERDICT_LABELS[row.verdict]}
            </Badge>
          ),
      },
      ...(canVerdict
        ? [
            {
              key: "actions",
              width: 88,
              align: "center",
              header: "행동",
              cell: (row: InspectionListItem) =>
                row.executionStatus === "PENDING" ||
                row.executionStatus === "IN_PROGRESS" ? (
                  <Button
                    variant="secondary"
                    onClick={() => setVerdictTarget(row)}
                  >
                    판정
                  </Button>
                ) : (
                  <span className="text-text-subtle">—</span>
                ),
            } satisfies DataTableColumn<InspectionListItem>,
          ]
        : []),
    ],
    [canVerdict, onOpenDetail],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.executionStatus !== undefined ||
    search.verdict !== undefined ||
    search.gate !== undefined;

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
          mergeInspectionsSearch(search, {
            pageSize: size === 10 ? undefined : size,
            page: undefined,
          }),
        )
      }

      label="검사 목록 페이지 탐색"
      onPageChange={(page) =>
        onSearchChange(mergeInspectionsSearch(search, { page }))
      }
      totalPages={totalPages}
    />
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="검사 대기·진행·판정 결과를 게이트와 규격 기준으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="품질 검사"
      />

      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "조회 조건을 선택하면 검사 목록을 확인합니다."
        }
      >
        <Input
          data-tour="list-search"
          aria-label="검사 검색"
          value={draft.q ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, q: event.target.value })
          }
          id="inspection-q"
          label="검색"
          name="q"
          placeholder="검사 번호·생산 LOT·규격"
        />
        <Select
          label="실행 상태"
          options={[
            { label: "전체 실행 상태", value: "all" },
            ...Object.entries(INSPECTION_EXECUTION_STATUS_LABELS).map(
              ([value, label]) => ({ label, value }),
            ),
          ]}
          value={
            draft.executionStatus?.length === 1
              ? (draft.executionStatus[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeInspectionsSearch(draft, {
                executionStatus:
                  value === "all"
                    ? undefined
                    : [
                        value as keyof typeof INSPECTION_EXECUTION_STATUS_LABELS,
                      ],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="판정"
          options={[
            { label: "전체 판정", value: "all" },
            ...Object.entries(INSPECTION_VERDICT_LABELS).map(
              ([value, label]) => ({
                label,
                value,
              }),
            ),
          ]}
          value={
            draft.verdict?.length === 1
              ? (draft.verdict[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeInspectionsSearch(draft, {
                verdict:
                  value === "all"
                    ? undefined
                    : [value as keyof typeof INSPECTION_VERDICT_LABELS],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="게이트"
          options={[
            { label: "전체 게이트", value: "all" },
            ...Object.entries(INSPECTION_GATE_LABELS).map(
              ([value, label]) => ({
                label,
                value,
              }),
            ),
          ]}
          value={
            draft.gate?.length === 1 ? (draft.gate[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeInspectionsSearch(draft, {
                gate:
                  value === "all"
                    ? undefined
                    : [value as keyof typeof INSPECTION_GATE_LABELS],
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      <>
        <ActionSheet
          open={verdictTarget !== null}
          onOpenChange={(open) => {
            if (!open) setVerdictTarget(null);
          }}
          title="검사 판정 입력"
          description="대상과 규격을 확인하고 판정을 기록하세요."
        >
          {verdictTarget !== null ? (
            <InspectionVerdictPanel
              csrfToken={csrfToken}
              onDone={() => {
                setVerdictTarget(null);
                reload();
              }}
              target={{
                inspectionId: verdictTarget.id,
                inspectionNumber: verdictTarget.inspectionNumber,
                specName: verdictTarget.specName,
                productionLotNumber: verdictTarget.productionLotNumber,
              }}
            />
          ) : null}
        </ActionSheet>
        <DataTable
          loading={state.phase === "loading"}
          loadingLabel="검사 목록 조회 중"
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
                title="조건에 맞는 검사가 없습니다"
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
          sort={{
            sort: search.sort ?? "createdAt",
            order: search.order ?? "asc",
          }}
          onSortChange={(next) =>
            onSearchChange({ ...search, ...next, page: 1 })
          }
          footer={pagination}
          rowNumberStart={
            (state.phase === "success" ? state.total : 0) -
            (currentPage - 1) * pageSize
          }
          onRowClick={(row) => onOpenDetail(row.id)}
          busy={isRefreshing}
          caption="품질 검사 목록"
          columns={columns}
          emptyMessage="조건에 맞는 검사가 없습니다."
          getRowKey={(row) => row.id}
          tourRecord="inspection"
          isTourPreferred={(row) =>
            row.executionStatus === "PENDING" ||
            row.executionStatus === "IN_PROGRESS"
          }
          rows={state.phase === "success" ? state.items : []}
        />
      </>
    </Main>
  );
}
