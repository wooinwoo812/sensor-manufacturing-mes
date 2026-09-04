import { useEffect, useMemo, useState } from "react";
import {
  fetchQualityIncidents,
  QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
  QUALITY_INCIDENT_STATUS_LABELS,
  type QualityIncidentListItem,
} from "@/entities/quality-incident";
import { QualityIncidentRegisterPanel } from "@/features/quality-incident-register";
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
  TableSkeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import {
  mergeIncidentsSearch,
  toIncidentsParams,
  type IncidentsSearch,
} from "../model/incidents-search";

const STATUS_TONES: Record<string, BadgeTone> = {
  OPEN: "danger",
  ASSESSED: "warning",
  CONTAINED: "info",
  CLOSED: "success",
};

const PAGE_SIZE = 20;

function formatIncidentDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: QualityIncidentListItem[];
      total: number;
      page: number;
    };

interface IncidentsPageProps {
  search: IncidentsSearch;
  onSearchChange: (next: IncidentsSearch) => void;
  csrfToken: string;
  canRegister: boolean;
  onOpenDetail: (qualityIncidentId: string) => void;
}

export function IncidentsPage({
  search,
  onSearchChange,
  csrfToken,
  canRegister,
  onOpenDetail,
}: IncidentsPageProps) {
  const searchKey = JSON.stringify(search);
  const [reloadCount, setReloadCount] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state: Exclude<LoadState, { phase: "loading" }>;
  } | null>(null);

  useEffect(() => {
    const searchValue = JSON.parse(searchKey) as IncidentsSearch;
    const controller = new AbortController();
    let active = true;
    fetchQualityIncidents(toIncidentsParams(searchValue), controller.signal)
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
                : "부적합 사건 목록을 불러오지 못했습니다.",
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

  const columns = useMemo<DataTableColumn<QualityIncidentListItem>[]>(
    () => [
      {
        key: "incidentNumber",
        header: "사건",
        cell: (row) => (
          <span className="text-xs tabular-nums font-bold text-text-strong">
            {row.incidentNumber}
          </span>
        ),
      },
      {
        key: "title",
        wrap: true,
        header: "제목",
        cell: (row) => (
          <span className="block min-w-48">
            <span className="block text-sm text-text-strong">{row.title}</span>
            {row.description !== null ? (
              <span className="block text-xs text-text-muted">{row.description}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: "source",
        wrap: true,
        header: "원천 대상",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm">
              {QUALITY_INCIDENT_SOURCE_TYPE_LABELS[row.sourceType]}
            </span>
            <span className="block text-xs tabular-nums text-text-muted">
              {row.sourceLotNumber}
            </span>
          </span>
        ),
      },
      {
        key: "status",
        header: "상태",
        cell: (row) => (
          <Badge tone={STATUS_TONES[row.status] ?? "neutral"}>
            {QUALITY_INCIDENT_STATUS_LABELS[row.status]}
          </Badge>
        ),
      },
      {
        key: "detectedAt",
        header: "발견",
        cell: (row) => (
          <time
            className="tabular-nums text-text-muted"
            dateTime={new Date(row.detectedAt).toISOString()}
          >
            {formatIncidentDateTime(row.detectedAt)}
          </time>
        ),
      },
      {
        key: "open",
        header: "상세",
        cell: (row) => (
          <Button variant="ghost" size="compact" onClick={() => onOpenDetail(row.id)}>
            상세 열기
          </Button>
        ),
      },
    ],
    [onOpenDetail],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.status !== undefined ||
    search.sourceType !== undefined;

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        actions={
          canRegister && !registerOpen ? (
            <Button onClick={() => setRegisterOpen(true)}>사건 등록</Button>
          ) : undefined
        }
        description="사후 발견 품질 문제의 사건·격리·처분 이력을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="부적합·격리"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (최근 발견 순서)`
            : "조회 조건을 선택하면 부적합 사건 목록을 확인합니다."
        }
      >
        <Input
          aria-label="부적합 사건 검색"
          defaultValue={search.q}
          id="incident-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(
                mergeIncidentsSearch(search, {
                  q: value === "" ? undefined : value,
                  page: undefined,
                }),
              );
            }
          }}
          placeholder="사건 번호·제목·LOT 번호"
        />
        <Select
          label="상태"
          options={[
            { label: "전체 상태", value: "all" },
            ...Object.entries(QUALITY_INCIDENT_STATUS_LABELS).map(
              ([value, label]) => ({ label, value }),
            ),
          ]}
          value={search.status?.length === 1 ? (search.status[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(
              mergeIncidentsSearch(search, {
                status:
                  value === "all"
                    ? undefined
                    : [
                        value as keyof typeof QUALITY_INCIDENT_STATUS_LABELS,
                      ],
                page: undefined,
              }),
            )
          }
        />
        <Select
          label="대상 유형"
          options={[
            { label: "전체 대상", value: "all" },
            ...Object.entries(QUALITY_INCIDENT_SOURCE_TYPE_LABELS).map(
              ([value, label]) => ({ label, value }),
            ),
          ]}
          value={
            search.sourceType?.length === 1
              ? (search.sourceType[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            onSearchChange(
              mergeIncidentsSearch(search, {
                sourceType:
                  value === "all"
                    ? undefined
                    : [
                        value as keyof typeof QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
                      ],
                page: undefined,
              }),
            )
          }
        />
        {hasActiveFilter ? (
          <Button variant="ghost" onClick={() => onSearchChange({})}>
            조건 초기화
          </Button>
        ) : null}
      </FilterBar>

      {state.phase === "loading" ? (
        <TableSkeleton label="부적합 사건 조회 중" />
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={
            <Button onClick={() => setReloadCount((count) => count + 1)}>
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 && !hasActiveFilter && !canRegister ? (
        <EmptyState
          title="부적합 사건이 없습니다"
          description="사후 품질 문제가 발견되면 이 화면에서 사건을 등록하고 격리를 관리합니다."
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 부적합 사건이 없습니다"
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
            onRowClick={(row) => onOpenDetail(row.id)}
            busy={isRefreshing}
            caption="부적합 사건 목록"
            columns={columns}
            emptyMessage="조건에 맞는 부적합 사건이 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <Pagination
            currentPage={currentPage}
            label="부적합 사건 페이지 탐색"
            onPageChange={(page) => onSearchChange(mergeIncidentsSearch(search, { page }))}
            totalPages={totalPages}
          />
        </>
      )}

      {canRegister ? (
        registerOpen ? (
          <QualityIncidentRegisterPanel
            csrfToken={csrfToken}
            onDone={() => {
              setRegisterOpen(false);
              setReloadCount((count) => count + 1);
            }}
          />
        ) : null
      ) : null}
    </Main>
  );
}
