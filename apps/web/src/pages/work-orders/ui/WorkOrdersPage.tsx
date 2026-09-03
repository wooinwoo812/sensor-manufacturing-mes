import { useEffect, useMemo, useState } from "react";
import {
  fetchWorkOrders,
  formatWorkOrderDueDate,
  isDueOverdue,
  toPriorityBadgeValue,
  WORK_ORDER_DUE_OPTIONS,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  type WorkOrderListItem,
} from "@/entities/work-order";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  type BadgeTone,
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  PageHeading,
  PriorityBadge,
  Select,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import {
  mergeWorkOrdersSearch,
  toWorkOrdersSearchParams,
  type WorkOrdersListSearch,
} from "../model/work-orders-search";

const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  RELEASED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const PAGE_SIZE = 20;

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: WorkOrderListItem[];
      total: number;
      page: number;
    };

interface WorkOrdersPageProps {
  search: WorkOrdersListSearch;
  onSearchChange: (next: WorkOrdersListSearch) => void;
  onOpenDetail: (workOrderId: string) => void;
  canCreate: boolean;
  onCreate: () => void;
}

export function WorkOrdersPage({
  search,
  onSearchChange,
  onOpenDetail,
  canCreate,
  onCreate,
}: WorkOrdersPageProps) {
  const searchKey = JSON.stringify(search);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state: Exclude<LoadState, { phase: "loading" }>;
  } | null>(null);

  useEffect(() => {
    const searchValue = JSON.parse(searchKey) as WorkOrdersListSearch;
    const controller = new AbortController();
    let active = true;
    fetchWorkOrders(toWorkOrdersSearchParams(searchValue), controller.signal)
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
                : "작업지시 목록을 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [searchKey, reloadCount]);

  const state: LoadState =
    result !== null && result.key === searchKey && result.reload === reloadCount
      ? result.state
      : { phase: "loading" };

  const columns = useMemo<DataTableColumn<WorkOrderListItem>[]>(
    () => [
      {
        key: "orderNumber",
        header: "작업지시",
        cell: (row) => (
          <button
            className="font-mono text-xs font-bold text-accent-strong underline-offset-4 hover:underline"
            onClick={() => onOpenDetail(row.id)}
            type="button"
          >
            {row.orderNumber}
          </button>
        ),
      },
      {
        key: "product",
        header: "제품",
        cell: (row) => (
          <span className="block min-w-32">
            <span className="block text-sm text-text-strong">{row.productName}</span>
            <span className="block font-mono text-xs text-text-muted">
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
        key: "dueDate",
        header: "납기",
        cell: (row) =>
          isDueOverdue(row.dueDate) && row.status !== "COMPLETED" ? (
            <Badge tone="danger">{`${formatWorkOrderDueDate(row.dueDate)} 지연`}</Badge>
          ) : (
            <time
              className="tabular-nums text-text-muted"
              dateTime={new Date(row.dueDate).toISOString()}
            >
              {formatWorkOrderDueDate(row.dueDate)}
            </time>
          ),
      },
      {
        key: "progressPercent",
        header: "진행률",
        cell: (row) => (
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-subtle"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${row.progressPercent}%` }}
              />
            </span>
            <span className="tabular-nums text-xs text-text-muted">
              {row.progressPercent}%
            </span>
          </span>
        ),
      },
      {
        key: "currentStepName",
        header: "현재 공정",
        cell: (row) => row.currentStepName ?? "—",
      },
      {
        key: "status",
        header: "상태",
        cell: (row) => (
          <Badge tone={STATUS_TONES[row.status] ?? "neutral"}>
            {WORK_ORDER_STATUS_LABELS[row.status]}
          </Badge>
        ),
      },
      {
        key: "blockedReason",
        header: "차단 사유",
        cell: (row) =>
          row.blockedReason === null ? (
            <span className="text-text-subtle">—</span>
          ) : (
            <Badge tone="warning">{row.blockedReason}</Badge>
          ),
      },
      {
        key: "priority",
        header: "우선순위",
        cell: (row) => (
          <PriorityBadge priority={toPriorityBadgeValue(row.priority)} />
        ),
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.status !== undefined ||
    search.priority !== undefined ||
    search.due !== undefined ||
    search.blocked !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        actions={
          canCreate ? (
            <Button onClick={onCreate}>작업지시 생성</Button>
          ) : undefined
        }
        description="생산 계획과 작업 진행의 기준이 되는 작업지시를 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="작업지시"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (납기 임박 순서)`
            : "조회 조건을 선택하면 작업지시를 확인합니다."
        }
      >
        <Input
          aria-label="작업지시 검색"
          defaultValue={search.q}
          id="work-order-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(mergeWorkOrdersSearch(search, {q: value === "" ? undefined : value,
                page: undefined,}));
            }
          }}
          placeholder="작업지시 번호·제품"
        />
        <Select
          label="상태"
          options={[
            { label: "전체 상태", value: "all" },
            ...WORK_ORDER_STATUSES.map((status) => ({
              label: WORK_ORDER_STATUS_LABELS[status],
              value: status,
            })),
          ]}
          value={search.status?.length === 1 ? (search.status[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeWorkOrdersSearch(search, {status:
                value === "all"
                  ? undefined
                  : [value as (typeof WORK_ORDER_STATUSES)[number]],
              page: undefined,}))
          }
        />
        <Select
          label="납기"
          options={Object.entries(WORK_ORDER_DUE_OPTIONS).map(([value, label]) => ({
            label,
            value,
          }))}
          value={search.due ?? "all"}
          onValueChange={(value) =>
            onSearchChange(mergeWorkOrdersSearch(search, {due:
                value === "all"
                  ? undefined
                  : (value as keyof typeof WORK_ORDER_DUE_OPTIONS),
              page: undefined,}))
          }
        />
        <Select
          label="우선순위"
          options={[
            { label: "전체 우선순위", value: "all" },
            ...WORK_ORDER_PRIORITIES.map((priority) => ({
              label: WORK_ORDER_PRIORITY_LABELS[priority],
              value: priority,
            })),
          ]}
          value={search.priority?.length === 1 ? (search.priority[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeWorkOrdersSearch(search, {priority:
                value === "all"
                  ? undefined
                  : [value as (typeof WORK_ORDER_PRIORITIES)[number]],
              page: undefined,}))
          }
        />
        <Select
          label="차단"
          options={[
            { label: "전체", value: "all" },
            { label: "차단만", value: "true" },
            { label: "차단 제외", value: "false" },
          ]}
          value={search.blocked === undefined ? "all" : String(search.blocked)}
          onValueChange={(value) =>
            onSearchChange(mergeWorkOrdersSearch(search, {blocked: value === "all" ? undefined : value === "true",
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
        <div className="space-y-2" aria-label="작업지시 조회 중" role="status">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
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
          title="조건에 맞는 작업지시가 없습니다"
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
          <DataTable
            caption="작업지시 목록"
            columns={columns}
            emptyMessage="조건에 맞는 작업지시가 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <nav
            aria-label="작업지시 페이지 탐색"
            className="flex items-center justify-end gap-2"
          >
            <Button
              disabled={currentPage <= 1}
              variant="secondary"
              onClick={() => onSearchChange(mergeWorkOrdersSearch(search, {page: currentPage - 1 }))}
            >
              이전
            </Button>
            <span className="text-xs tabular-nums text-text-muted">
              {currentPage} / {totalPages} 페이지
            </span>
            <Button
              disabled={currentPage >= totalPages}
              variant="secondary"
              onClick={() => onSearchChange(mergeWorkOrdersSearch(search, {page: currentPage + 1 }))}
            >
              다음
            </Button>
          </nav>
        </>
      )}
    </Main>
  );
}
