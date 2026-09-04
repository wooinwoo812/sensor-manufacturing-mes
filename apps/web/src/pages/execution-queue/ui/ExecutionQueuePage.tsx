import { useEffect, useMemo, useState } from "react";
import {
  BLOCKED_REASON_LABELS,
  fetchProcessExecutions,
  PROCESS_READINESS_FILTER_OPTIONS,
  PROCESS_READINESS_LABELS,
  type ProcessExecutionListItem,
} from "@/entities/process-execution";
import { ProcessExecutionPanel, StartProcessAction } from "@/features/process-execution";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  TableSkeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
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

const PAGE_SIZE = 20;

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: ProcessExecutionListItem[];
      total: number;
      page: number;
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
  const [reloadCount, setReloadCount] = useState(0);
  const [completionTarget, setCompletionTarget] =
    useState<ProcessExecutionListItem | null>(null);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state: Exclude<LoadState, { phase: "loading" }>;
  } | null>(null);

  useEffect(() => {
    const searchValue = JSON.parse(searchKey) as ExecutionQueueSearch;
    const controller = new AbortController();
    let active = true;
    fetchProcessExecutions(toExecutionQueueParams(searchValue), controller.signal)
      .then((response) => {
        if (!active) {
          return;
        }
        setResult({
          key: searchKey,
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
        if (!active) {
          return;
        }
        setResult({
          key: searchKey,
          reload: reloadCount,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "공정 실행 대기열을 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchKey, reloadCount]);

  const isCurrent =
    result !== null && result.key === searchKey && result.reload === reloadCount;
  // 조건이 바뀌어도 이전 결과가 있으면 그대로 두고 흐리게만 표시한다.
  // 매번 스켈레톤으로 갈아끼우면 표가 사라졌다 나타나 화면이 흔들린다.
  const isRefreshing = result !== null && result.state.phase === "success" && !isCurrent;
  const state: LoadState =
    isCurrent || isRefreshing ? result!.state : { phase: "loading" };

  const columns = useMemo<DataTableColumn<ProcessExecutionListItem>[]>(
    () => [
      {
        key: "workOrderNumber",
        header: "작업지시",
        cell: (row) => (
          <span className="text-xs tabular-nums font-bold text-text-strong">
            {row.workOrderNumber}
          </span>
        ),
      },
      {
        key: "productionLotNumber",
        header: "생산 LOT",
        cell: (row) => (
          <span className="text-xs tabular-nums text-text-muted">
            {row.productionLotNumber}
          </span>
        ),
      },
      {
        key: "processStepName",
        header: "공정",
        cell: (row) => (
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-xs text-text-muted">
              {String(row.sequence).padStart(2, "0")}
            </span>
            <span className="text-sm text-text-strong">{row.processStepName}</span>
          </span>
        ),
      },
      {
        key: "product",
        wrap: true,
        header: "제품",
        cell: (row) => (
          <span className="block min-w-32">
            <span className="block text-sm text-text-strong">{row.productName}</span>
            <span className="block text-xs tabular-nums text-text-muted">
              {row.productCode}
            </span>
          </span>
        ),
      },
      {
        key: "plannedQuantity",
        header: "계획수량",
        align: "right",
        cell: (row) => (
          <span className="tabular-nums">
            {row.plannedQuantity.toLocaleString("ko-KR")} {row.unit}
          </span>
        ),
      },
      {
        key: "readiness",
        header: "준비 상태",
        cell: (row) => (
          <Badge tone={READINESS_TONES[row.readiness] ?? "neutral"}>
            {PROCESS_READINESS_LABELS[row.readiness]}
          </Badge>
        ),
      },
      {
        key: "blockedReasonCodes",
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
              header: "행동",
              cell: (row: ProcessExecutionListItem) =>
                row.readiness === "READY" ? (
                  <StartProcessAction
                    csrfToken={csrfToken}
                    onDone={() => setReloadCount((count) => count + 1)}
                    target={{
                      stepId: row.id,
                      workOrderNumber: row.workOrderNumber,
                      processStepName: row.processStepName,
                      productionLotNumber: row.productionLotNumber,
                      plannedQuantity: row.plannedQuantity,
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
    [canExecute, csrfToken],
  );

  const hasActiveFilter = search.q !== undefined || search.readiness !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="지금 실행 가능한 공정과 차단 사유를 작업지시·생산 LOT 기준으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="공정 실행 대기열"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (작업지시·공정 순서)`
            : "조회 조건을 선택하면 공정 실행 대기열을 확인합니다."
        }
      >
        <Input
          aria-label="공정 대기열 검색"
          defaultValue={search.q}
          id="execution-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(mergeExecutionQueueSearch(search, {q: value === "" ? undefined : value,
                page: undefined,}));
            }
          }}
          placeholder="작업지시·공정·생산 LOT"
        />
        <Select
          label="준비 상태"
          options={Object.entries(PROCESS_READINESS_FILTER_OPTIONS).map(
            ([value, label]) => ({ label, value }),
          )}
          value={search.readiness ?? "all"}
          onValueChange={(value) =>
            onSearchChange(mergeExecutionQueueSearch(search, {readiness:
                value === "all"
                  ? undefined
                  : (value as keyof typeof PROCESS_READINESS_FILTER_OPTIONS),
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
        <TableSkeleton label="공정 대기열 조회 중" />
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={
            <Button onClick={() => setReloadCount((count) => count + 1)}>
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 공정이 없습니다"
          description="조회 조건을 초기화하거나 다른 준비 상태로 확인해 주세요."
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
          <DataTable
            busy={isRefreshing}
            onRowClick={onOpenDetail}
            caption="공정 실행 대기열"
            columns={columns}
            emptyMessage="조건에 맞는 공정이 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <Pagination
            currentPage={currentPage}
            label="공정 대기열 페이지 탐색"
            onPageChange={(page) => onSearchChange(mergeExecutionQueueSearch(search, { page }))}
            totalPages={totalPages}
          />
        </>
      )}

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setCompletionTarget(null);
          }
        }}
        open={completionTarget !== null}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl" side="right">
          <SheetHeader>
            <SheetTitle>공정 완료 실적 입력</SheetTitle>
            <SheetDescription>
              선택한 공정의 양품·불량 수량을 기록합니다. 저장하면 대기열이 갱신됩니다.
            </SheetDescription>
          </SheetHeader>
          {completionTarget !== null ? (
            <div className="px-4 pb-4">
              <ProcessExecutionPanel
                csrfToken={csrfToken}
                onDone={() => {
                  setCompletionTarget(null);
                  setReloadCount((count) => count + 1);
                }}
                target={{
                  stepId: completionTarget.id,
                  workOrderNumber: completionTarget.workOrderNumber,
                  processStepName: completionTarget.processStepName,
                  productionLotNumber: completionTarget.productionLotNumber,
                  plannedQuantity: completionTarget.plannedQuantity,
                }}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Main>
  );
}
