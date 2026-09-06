import { getPageSize } from "@/shared/lib";
import { useMemo, useState } from "react";
import {
  BLOCKED_REASON_LABELS,
  fetchProcessExecutions,
  PROCESS_READINESS_FILTER_OPTIONS,
  PROCESS_READINESS_LABELS,
  type ProcessExecutionListItem,
} from "@/entities/process-execution";
import {
  ProcessExecutionPanel,
  StartProcessAction,
} from "@/features/process-execution";
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
  TableSkeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
import { useLoadState, useQueryDraft } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";
import {
  mergeExecutionQueueSearch,
  toExecutionQueueParams,
  type ExecutionQueueSearch,
} from "../model/execution-queue-search";

const READINESS_TONES: Record<string, BadgeTone> = {
  WAITING: "neutral",
  READY: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  BLOCKED: "danger",
};

interface ExecutionQueuePageProps {
  search: ExecutionQueueSearch;
  onSearchChange: (next: ExecutionQueueSearch) => void;
  csrfToken: string;
  canExecute: boolean;
  /** 행을 누르면 공정 실행 상세로 간다. 상세 라우트는 있었지만 어디에서도 연결되지 않았다. */
  onOpenDetail?: ((row: ProcessExecutionListItem) => void) | undefined;
}

function blockedReasonLabel(code: string): string {
  return (
    BLOCKED_REASON_LABELS[code as keyof typeof BLOCKED_REASON_LABELS] ?? code
  );
}

export function ExecutionQueuePage({
  search,
  onSearchChange,
  csrfToken,
  canExecute,
  onOpenDetail,
}: ExecutionQueuePageProps) {
  const searchKey = JSON.stringify(search);
  const [completionTarget, setCompletionTarget] =
    useState<ProcessExecutionListItem | null>(null);
  const { state, isRefreshing, reload } = useLoadState<{
    items: ProcessExecutionListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as ExecutionQueueSearch;
      return fetchProcessExecutions(
        toExecutionQueueParams(searchValue),
        signal,
      ).then((response) => ({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      }));
    },
    "공정 실행 대기열을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<ProcessExecutionListItem>[]>(
    () => [
      {
        key: "workOrderNumber",
        width: 128,
        sortKey: "orderNumber",
        align: "left",
        header: "작업지시",
        cell: (row) => (
          <span className="text-xs tabular-nums font-bold text-text-strong">
            {row.workOrderNumber}
          </span>
        ),
      },
      {
        key: "productionLotNumber",
        width: 160,
        sortKey: "productionLotNumber",
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
        width: 144,
        sortKey: "sequence",
        align: "left",
        header: "공정",
        cell: (row) => (
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-xs text-text-muted">
              {String(row.sequence).padStart(2, "0")}
            </span>
            <span className="text-sm text-text-strong">
              {row.processStepName}
            </span>
          </span>
        ),
      },
      {
        key: "product",
        width: 216,
        align: "left",
        wrap: true,
        header: "제품",
        cell: (row) => (
          <span className="block w-full space-y-0.5">
            <span className="block text-sm font-medium leading-5 text-text-strong">
              {row.productName}
            </span>
            <span className="block text-sm leading-5 tabular-nums text-text-muted">
              {row.productCode}
            </span>
          </span>
        ),
      },
      {
        key: "plannedQuantity",
        width: 96,
        align: "center",
        header: "계획수량",

        cell: (row) => (
          <span className="tabular-nums">
            {row.plannedQuantity.toLocaleString("ko-KR")} {row.unit}
          </span>
        ),
      },
      {
        key: "readiness",
        width: 104,
        align: "center",
        header: "준비 상태",
        cell: (row) => (
          <Badge tone={READINESS_TONES[row.readiness] ?? "neutral"}>
            {PROCESS_READINESS_LABELS[row.readiness]}
          </Badge>
        ),
      },
      {
        key: "blockedReasonCodes",
        width: 160,
        align: "left",
        wrap: true,
        header: "차단 사유",
        cell: (row) =>
          row.blockedReasonCodes.length === 0 ? (
            <span className="text-text-subtle">—</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {row.blockedReasonCodes.map((code) => (
                <Badge key={code} tone="warning">
                  {blockedReasonLabel(code)}
                </Badge>
              ))}
            </span>
          ),
      },
      ...(canExecute
        ? [
            {
              key: "actions",
              width: 104,
              align: "center",
              header: "행동",
              cell: (row: ProcessExecutionListItem) =>
                row.readiness === "READY" ? (
                  <StartProcessAction
                    csrfToken={csrfToken}
                    onDone={() => reload()}
                    target={{
                      stepId: row.id,
                      workOrderNumber: row.workOrderNumber,
                      processStepName: row.processStepName,
                      productionLotNumber: row.productionLotNumber,
                      plannedQuantity: row.plannedQuantity,
                      outputQuantityLimit: row.outputQuantityLimit,
                    }}
                  />
                ) : row.readiness === "IN_PROGRESS" ? (
                  <Button
                    variant="secondary"
                    onClick={() => setCompletionTarget(row)}
                  >
                    완료 입력
                  </Button>
                ) : (
                  <span className="text-text-subtle">—</span>
                ),
            } satisfies DataTableColumn<ProcessExecutionListItem>,
          ]
        : []),
    ],
    [canExecute, csrfToken, reload],
  );

  const hasActiveFilter =
    search.q !== undefined || search.readiness !== undefined;

  const pageSize =
    state.phase === "success" ? state.pageSize : getPageSize(search.pageSize);
  const currentPage =
    state.phase === "success" ? state.page : (search.page ?? 1);
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / pageSize))
      : 1;

  const pagination =
    state.phase === "success" ? (
      <Pagination
        currentPage={currentPage}
        totalItems={state.total}
        pageSize={pageSize}
        onPageSizeChange={(size) =>
          onSearchChange(
            mergeExecutionQueueSearch(search, {
              pageSize: size === 10 ? undefined : size,
              page: undefined,
            }),
          )
        }
        busy={isRefreshing}
        label="공정 대기열 페이지 탐색"
        onPageChange={(page) =>
          onSearchChange(mergeExecutionQueueSearch(search, { page }))
        }
        totalPages={totalPages}
      />
    ) : null;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="지금 실행 가능한 공정과 차단 사유를 작업지시·생산 LOT 기준으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="공정 실행 대기열"
      />

      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "조회 조건을 선택하면 공정 실행 대기열을 확인합니다."
        }
      >
        <Input
          data-tour="list-search"
          aria-label="공정 대기열 검색"
          value={draft.q ?? ""}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          id="execution-q"
          label="검색"
          name="q"
          placeholder="작업지시·공정·생산 LOT"
        />
        <Select
          label="준비 상태"
          options={Object.entries(PROCESS_READINESS_FILTER_OPTIONS).map(
            ([value, label]) => ({ label, value }),
          )}
          value={draft.readiness ?? "all"}
          onValueChange={(value) =>
            setDraft(
              mergeExecutionQueueSearch(draft, {
                readiness:
                  value === "all"
                    ? undefined
                    : (value as keyof typeof PROCESS_READINESS_FILTER_OPTIONS),
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton
          columns={columns}
          caption="공정 실행 대기열"
          clickable
          sort={{
            sort: search.sort ?? "orderNumber",
            order: search.order ?? "asc",
          }}
          onSortChange={(next) =>
            onSearchChange({ ...search, ...next, page: 1 })
          }
          label="공정 대기열 조회 중"
          rows={pageSize}
        />
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={<Button onClick={() => reload()}>다시 시도</Button>}
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 공정이 없습니다"
          description="조회 조건을 초기화하거나 다른 준비 상태로 확인해 주세요."
          action={
            hasActiveFilter ? (
              <Button variant="secondary" onClick={reset}>
                조건 초기화
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            sort={{
              sort: search.sort ?? "orderNumber",
              order: search.order ?? "asc",
            }}
            onSortChange={(next) =>
              onSearchChange({ ...search, ...next, page: 1 })
            }
            footer={pagination}
            rowNumberStart={state.total - (currentPage - 1) * pageSize}
            busy={isRefreshing}
            onRowClick={onOpenDetail}
            caption="공정 실행 대기열"
            columns={columns}
            emptyMessage="조건에 맞는 공정이 없습니다."
            getRowKey={(row) => row.id}
            tourRecord="execution"
            getTourContext={(row) => row.productionLotNumber}
            isTourPreferred={(row) => row.readiness === "IN_PROGRESS"}
            rows={state.items}
          />
        </>
      )}

      <ActionSheet
        open={completionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCompletionTarget(null);
        }}
        title="공정 완료 실적 입력"
        description="선택한 공정의 양품·불량 수량을 기록합니다. 저장하면 대기열이 갱신됩니다."
      >
        {completionTarget !== null ? (
          <>
            <ProcessExecutionPanel
              csrfToken={csrfToken}
              onDone={() => {
                setCompletionTarget(null);
                reload();
              }}
              target={{
                stepId: completionTarget.id,
                workOrderNumber: completionTarget.workOrderNumber,
                processStepName: completionTarget.processStepName,
                productionLotNumber: completionTarget.productionLotNumber,
                plannedQuantity: completionTarget.plannedQuantity,
                outputQuantityLimit: completionTarget.outputQuantityLimit,
              }}
            />
          </>
        ) : null}
      </ActionSheet>
      {state.phase === "success" && state.items.length === 0 ? (
        <div className="rounded-panel border border-border bg-surface">
          {pagination}
        </div>
      ) : null}
    </Main>
  );
}
