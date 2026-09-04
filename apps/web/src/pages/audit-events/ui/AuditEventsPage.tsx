import { useEffect, useMemo, useState } from "react";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTOR_ROLE_OPTIONS,
  AUDIT_ENTITY_TYPE_LABELS,
  fetchAuditEvents,
  formatAuditDateTime,
  type AuditEventListItem,
} from "@/entities/audit-event";
import { ApiRequestError } from "@/shared/api";
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
  TableSkeleton,
  type DataTableColumn,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import {
  mergeAuditEventsSearch,
  toAuditEventsParams,
  type AuditEventsSearch,
} from "../model/audit-events-search";

const PAGE_SIZE = 20;

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: AuditEventListItem[];
      total: number;
      page: number;
    };

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

export function AuditEventsPage({ search, onSearchChange }: AuditEventsPageProps) {
  const searchKey = JSON.stringify(search);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state: Exclude<LoadState, { phase: "loading" }>;
  } | null>(null);

  useEffect(() => {
    const searchValue = JSON.parse(searchKey) as AuditEventsSearch;
    const controller = new AbortController();
    let active = true;
    fetchAuditEvents(toAuditEventsParams(searchValue), controller.signal)
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
                : "감사 이벤트를 불러오지 못했습니다.",
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

  const columns = useMemo<DataTableColumn<AuditEventListItem>[]>(
    () => [
      {
        key: "occurredAt",
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
        header: "행위자",
        cell: (row) => (
          <span className="block min-w-28">
            <span className="block text-sm text-text-strong">{row.actorName}</span>
            <span className="block text-xs text-text-muted">
              {AUDIT_ACTOR_ROLE_OPTIONS[row.actorRole]}
            </span>
          </span>
        ),
      },
      {
        key: "action",
        header: "행동",
        cell: (row) => (
          <span className="text-sm text-text-strong">
            {AUDIT_ACTION_LABELS[row.action]}
          </span>
        ),
      },
      {
        key: "entity",
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
        wrap: true,
        header: "내용",
        cell: (row) => (
          <span className="block min-w-48 text-sm text-text-strong">{row.summary}</span>
        ),
      },
      {
        key: "requestId",
        header: "요청 ID",
        cell: (row) => (
          <span className="text-xs tabular-nums text-text-muted">{row.requestId}</span>
        ),
      },
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.actorRole !== undefined ||
    search.action !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="상태 변경의 행위자·시각·사유를 감사 이력으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="감사 이벤트"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (최근 순서)`
            : "조회 조건을 선택하면 감사 이벤트를 확인합니다."
        }
      >
        <Input
          aria-label="감사 이벤트 검색"
          defaultValue={search.q}
          id="audit-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(mergeAuditEventsSearch(search, {q: value === "" ? undefined : value,
                page: undefined,}));
            }
          }}
          placeholder="내용·대상·행위자·요청 ID"
        />
        <Select
          label="행위자 역할"
          options={[
            { label: "전체 역할", value: "all" },
            ...Object.entries(AUDIT_ACTOR_ROLE_OPTIONS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={search.actorRole?.length === 1 ? (search.actorRole[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeAuditEventsSearch(search, {actorRole:
                value === "all"
                  ? undefined
                  : [value as keyof typeof AUDIT_ACTOR_ROLE_OPTIONS],
              page: undefined,}))
          }
        />
        <Select
          label="행동"
          options={[
            { label: "전체 행동", value: "all" },
            ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={search.action?.length === 1 ? (search.action[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeAuditEventsSearch(search, {action: value === "all" ? undefined : [value as keyof typeof AUDIT_ACTION_LABELS],
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
        <TableSkeleton label="감사 이벤트 조회 중" />
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
          title="조건에 맞는 감사 이벤트가 없습니다"
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
            busy={isRefreshing}
            caption="감사 이벤트 목록"
            columns={columns}
            emptyMessage="조건에 맞는 감사 이벤트가 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <Pagination
            currentPage={currentPage}
            label="감사 이벤트 페이지 탐색"
            onPageChange={(page) => onSearchChange(mergeAuditEventsSearch(search, { page }))}
            totalPages={totalPages}
          />
        </>
      )}
    </Main>
  );
}
