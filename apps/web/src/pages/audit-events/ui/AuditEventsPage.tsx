import { getPageSize } from "@/shared/lib";
import { useMemo } from "react";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTOR_ROLE_OPTIONS,
  AUDIT_ENTITY_TYPE_LABELS,
  fetchAuditEvents,
  formatAuditDateTime,
  type AuditEventListItem,
} from "@/entities/audit-event";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  PageHeading,
  Pagination,
  Select,
  type DataTableColumn,
} from "@/shared/ui";
import { useLoadState, useQueryDraft } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";
import {
  mergeAuditEventsSearch,
  toAuditEventsParams,
  type AuditEventsSearch,
} from "../model/audit-events-search";

interface AuditEventsPageProps {
  search: AuditEventsSearch;
  onSearchChange: (next: AuditEventsSearch) => void;
}

function entityLabel(entityType: string): string {
  return (
    AUDIT_ENTITY_TYPE_LABELS[
      entityType as keyof typeof AUDIT_ENTITY_TYPE_LABELS
    ] ?? entityType
  );
}

export function AuditEventsPage({
  search,
  onSearchChange,
}: AuditEventsPageProps) {
  const searchKey = JSON.stringify(search);
  const { state, isRefreshing, reload } = useLoadState<{
    items: AuditEventListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as AuditEventsSearch;
      return fetchAuditEvents(toAuditEventsParams(searchValue), signal).then(
        (response) => ({
          items: response.items,
          total: response.total,
          page: response.page,
          pageSize: response.pageSize,
        }),
      );
    },
    "감사 이벤트를 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<AuditEventListItem>[]>(
    () => [
      {
        key: "occurredAt",
        width: 184,
        sortKey: "occurredAt",
        align: "center",
        header: "시각",
        cell: (row) => (
          <time
            className="whitespace-nowrap tabular-nums text-xs text-text-muted"
            dateTime={row.occurredAt}
          >
            {formatAuditDateTime(row.occurredAt)}
          </time>
        ),
      },
      {
        key: "actor",
        width: 128,
        align: "left",
        header: "행위자",
        cell: (row) => (
          <span className="block min-w-28">
            <span className="block text-sm text-text-strong">
              {row.actorName}
            </span>
            <span className="block text-xs text-text-muted">
              {AUDIT_ACTOR_ROLE_OPTIONS[row.actorRole]}
            </span>
          </span>
        ),
      },
      {
        key: "action",
        width: 140,
        align: "left",
        header: "행동",
        cell: (row) => (
          <span className="text-sm text-text-strong">
            {AUDIT_ACTION_LABELS[row.action]}
          </span>
        ),
      },
      {
        key: "entity",
        width: 190,
        sortKey: "entityId",
        align: "left",
        header: "대상",
        cell: (row) => (
          <span className="block min-w-28">
            <span className="block text-xs text-text-muted">
              {entityLabel(row.entityType)}
            </span>
            <span className="block text-xs font-semibold tabular-nums text-text-strong">
              {row.entityId}
            </span>
          </span>
        ),
      },
      {
        key: "summary",
        width: 280,
        align: "left",
        header: "내용",
        cell: (row) => (
          <span className="block text-sm text-text-strong">{row.summary}</span>
        ),
      },
      {
        key: "requestId",
        width: 290,
        align: "left",
        header: "요청 ID",
        cell: (row) => (
          <span className="break-all text-sm tabular-nums text-text-muted">
            {row.requestId}
          </span>
        ),
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.actorRole !== undefined ||
    search.action !== undefined;

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
          mergeAuditEventsSearch(search, {
            pageSize: size === 10 ? undefined : size,
            page: undefined,
          }),
        )
      }

      label="감사 이벤트 페이지 탐색"
      onPageChange={(page) =>
        onSearchChange(mergeAuditEventsSearch(search, { page }))
      }
      totalPages={totalPages}
    />
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="상태 변경의 행위자·시각·사유를 감사 이력으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="감사 이벤트"
      />

      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "조회 조건을 선택하면 감사 이벤트를 확인합니다."
        }
      >
        <Input
          aria-label="감사 이벤트 검색"
          value={draft.q ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, q: event.target.value })
          }
          id="audit-q"
          data-tour="audit-search"
          label="검색"
          name="q"
          placeholder="내용·대상·행위자·요청 ID"
        />
        <Select
          label="행위자 역할"
          tourAnchor="audit-role"
          options={[
            { label: "전체 역할", value: "all" },
            ...Object.entries(AUDIT_ACTOR_ROLE_OPTIONS).map(
              ([value, label]) => ({
                label,
                value,
              }),
            ),
          ]}
          value={
            draft.actorRole?.length === 1
              ? (draft.actorRole[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeAuditEventsSearch(draft, {
                actorRole:
                  value === "all"
                    ? undefined
                    : [value as keyof typeof AUDIT_ACTOR_ROLE_OPTIONS],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="행동"
          tourAnchor="audit-action"
          options={[
            { label: "전체 행동", value: "all" },
            ...Object.entries(AUDIT_ACTION_LABELS).map(
              ([value, label]) => ({
                label,
                value,
              }),
            ),
          ]}
          value={
            draft.action?.length === 1 ? (draft.action[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeAuditEventsSearch(draft, {
                action:
                  value === "all"
                    ? undefined
                    : [value as keyof typeof AUDIT_ACTION_LABELS],
                page: undefined,
              }),
            )
          }
        />
      </FilterBar>

      <DataTable
        loading={state.phase === "loading"}
        loadingLabel="감사 이벤트 조회 중"
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
              title="조건에 맞는 감사 이벤트가 없습니다"
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
          sort: search.sort ?? "occurredAt",
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
        caption="감사 이벤트 목록"
        columns={columns}
        emptyMessage="조건에 맞는 감사 이벤트가 없습니다."
        getRowKey={(row) => row.id}
        tourRecord="audit"
        rows={state.phase === "success" ? state.items : []}
      />
    </Main>
  );
}
