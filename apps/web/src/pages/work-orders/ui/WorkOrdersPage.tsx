import { getPageSize } from "@/shared/lib";
import { useMemo } from "react";
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
  PriorityBadge,
  Select,
  TableSkeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
import { useLoadState, useQueryDraft } from "@/shared/lib";
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
  const { state, isRefreshing, reload } = useLoadState<{
    items: WorkOrderListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as WorkOrdersListSearch;
      return fetchWorkOrders(
        toWorkOrdersSearchParams(searchValue),
        signal,
      ).then((response) => ({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      }));
    },
    "작업지시 목록을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<WorkOrderListItem>[]>(
    () => [
      {
        key: "orderNumber",
        align: "left",
        header: "작업지시",
        cell: (row) => (
          <button
            className="text-sm font-semibold tabular-nums text-accent-strong underline-offset-4 hover:underline"
            onClick={() => onOpenDetail(row.id)}
            type="button"
          >
            {row.orderNumber}
          </button>
        ),
      },
      {
        key: "product",
        align: "left",
        wrap: true,
        header: "제품",
        cell: (row) => (
          <span className="block min-w-48 max-w-72 space-y-0.5">
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
        key: "priority",
        align: "center",
        header: "우선순위",

        cell: (row) => (
          <PriorityBadge priority={toPriorityBadgeValue(row.priority)} />
        ),
      },
      {
        key: "plannedQuantity",
        align: "center",
        header: "계획수량",

        cell: (row) => (
          <span className="tabular-nums">
            {row.plannedQuantity.toLocaleString("ko-KR")} {row.unit}
          </span>
        ),
      },
      {
        key: "dueDate",
        align: "center",
        header: "납기",
        cell: (row) =>
          isDueOverdue(row.dueDate) && row.status !== "COMPLETED" ? (
            <span className="inline-flex items-center gap-1.5 text-danger-strong">
              <time dateTime={new Date(row.dueDate).toISOString()}>
                {formatWorkOrderDueDate(row.dueDate)}
              </time>
              <span className="font-medium">지연</span>
            </span>
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
        align: "center",
        header: "진행률",
        cell: (row) => (
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-subtle"
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
        align: "left",
        header: "현재 공정",
        cell: (row) => row.currentStepName ?? "—",
      },
      {
        key: "status",
        align: "center",
        header: "상태",
        cell: (row) => (
          <Badge tone={STATUS_TONES[row.status] ?? "neutral"}>
            {WORK_ORDER_STATUS_LABELS[row.status]}
          </Badge>
        ),
      },
      {
        key: "blockedReason",
        align: "left",
        wrap: true,
        header: "차단 사유",
        cell: (row) =>
          row.blockedReason === null ? (
            <span className="text-text-subtle">—</span>
          ) : (
            <span className="block max-w-52 text-sm leading-5 text-warning-strong">
              {row.blockedReason}
            </span>
          ),
      },
    ],
    [onOpenDetail],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.status !== undefined ||
    search.priority !== undefined ||
    search.due !== undefined ||
    search.blocked !== undefined;

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
            mergeWorkOrdersSearch(search, {
              pageSize: size === 10 ? undefined : size,
              page: undefined,
            }),
          )
        }
        busy={isRefreshing}
        label="작업지시 페이지 탐색"
        onPageChange={(page) =>
          onSearchChange(mergeWorkOrdersSearch(search, { page }))
        }
        totalPages={totalPages}
      />
    ) : null;

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
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (납기 임박 순서)`
            : "조회 조건을 선택하면 작업지시를 확인합니다."
        }
      >
        <Input
          data-tour="list-search"
          aria-label="작업지시 검색"
          value={draft.q ?? ""}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          id="work-order-q"
          label="검색"
          name="q"
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
          value={
            draft.status?.length === 1 ? (draft.status[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeWorkOrdersSearch(draft, {
                status:
                  value === "all"
                    ? undefined
                    : [value as (typeof WORK_ORDER_STATUSES)[number]],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="납기"
          options={Object.entries(WORK_ORDER_DUE_OPTIONS).map(
            ([value, label]) => ({
              label,
              value,
            }),
          )}
          value={draft.due ?? "all"}
          onValueChange={(value) =>
            setDraft(
              mergeWorkOrdersSearch(draft, {
                due:
                  value === "all"
                    ? undefined
                    : (value as keyof typeof WORK_ORDER_DUE_OPTIONS),
                page: undefined,
              }),
            )
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
          value={
            draft.priority?.length === 1 ? (draft.priority[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeWorkOrdersSearch(draft, {
                priority:
                  value === "all"
                    ? undefined
                    : [value as (typeof WORK_ORDER_PRIORITIES)[number]],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="차단"
          options={[
            { label: "전체", value: "all" },
            { label: "차단만", value: "true" },
            { label: "차단 제외", value: "false" },
          ]}
          value={draft.blocked === undefined ? "all" : String(draft.blocked)}
          onValueChange={(value) =>
            setDraft(
              mergeWorkOrdersSearch(draft, {
                blocked: value === "all" ? undefined : value === "true",
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton label="작업지시 조회 중" rows={pageSize} />
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={<Button onClick={() => reload()}>다시 시도</Button>}
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 작업지시가 없습니다"
          description="조회 조건을 초기화하거나 다른 조건으로 확인해 주세요."
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
            footer={pagination}
            rowNumberStart={state.total - (currentPage - 1) * pageSize}
            onRowClick={(row) => onOpenDetail(row.id)}
            busy={isRefreshing}
            caption="작업지시 목록"
            columns={columns}
            emptyMessage="조건에 맞는 작업지시가 없습니다."
            getRowKey={(row) => row.id}
            tourRecord="work-order"
            isTourPreferred={(row) =>
              row.status === "RELEASED" || row.status === "IN_PROGRESS"
            }
            rows={state.items}
          />
        </>
      )}
      {state.phase === "success" && state.items.length === 0 ? (
        <div className="rounded-panel border border-border bg-surface">
          {pagination}
        </div>
      ) : null}
    </Main>
  );
}
