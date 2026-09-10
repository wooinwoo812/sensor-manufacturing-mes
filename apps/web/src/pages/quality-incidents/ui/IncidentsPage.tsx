import { applyListSort } from "@/shared/lib";
import { getPageSize } from "@/shared/lib";
import { useMemo, useState } from "react";
import {
  fetchQualityIncidents,
  QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
  QUALITY_INCIDENT_STATUS_LABELS,
  type QualityIncidentListItem,
} from "@/entities/quality-incident";
import { QualityIncidentRegisterPanel } from "@/features/quality-incident-register";
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const { state, isRefreshing, reload } = useLoadState<{
    items: QualityIncidentListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    searchKey,
    (signal) => {
      const searchValue = JSON.parse(searchKey) as IncidentsSearch;
      return fetchQualityIncidents(toIncidentsParams(searchValue), signal).then(
        (response) => ({
          items: response.items,
          total: response.total,
          page: response.page,
          pageSize: response.pageSize,
        }),
      );
    },
    "부적합 사건 목록을 불러오지 못했습니다.",
  );

  const { draft, setDraft, submit, reset, hasPendingChanges } = useQueryDraft(
    search,
    onSearchChange,
    reload,
  );

  const columns = useMemo<DataTableColumn<QualityIncidentListItem>[]>(
    () => [
      {
        key: "incidentNumber",
        width: 180,
        sortKey: "incidentNumber",
        align: "left",
        header: "사건",
        cell: (row) => (
          <span className="text-xs tabular-nums font-bold text-text-strong">
            {row.incidentNumber}
          </span>
        ),
      },
      {
        key: "title",
        width: 280,
        align: "left",
        header: "제목",
        cell: (row) => (
          <span className="block min-w-48">
            <span className="block text-sm text-text-strong">{row.title}</span>
            {row.description !== null ? (
              <span className="block text-xs text-text-muted">
                {row.description}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "source",
        width: 240,
        align: "left",
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
        width: 120,
        align: "center",
        header: "상태",
        cell: (row) => (
          <Badge tone={STATUS_TONES[row.status] ?? "neutral"}>
            {QUALITY_INCIDENT_STATUS_LABELS[row.status]}
          </Badge>
        ),
      },
      {
        key: "detectedAt",
        width: 170,
        sortKey: "detectedAt",
        align: "center",
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
    ],
    [],
  );

  const hasActiveFilter =
    search.q !== undefined ||
    search.status !== undefined ||
    search.sourceType !== undefined;

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
          mergeIncidentsSearch(search, {
            pageSize: size === 10 ? undefined : size,
            page: undefined,
          }),
        )
      }

      label="부적합 사건 페이지 탐색"
      onPageChange={(page) =>
        onSearchChange(mergeIncidentsSearch(search, { page }))
      }
      totalPages={totalPages}
    />
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        actions={
          canRegister ? (
            <Button onClick={() => setRegisterOpen(true)}>사건 등록</Button>
          ) : undefined
        }
        description="사후 발견 품질 문제의 사건·격리·처분 이력을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="부적합·격리"
      />
      <FilterBar
        onSearch={submit}
        onReset={reset}
        busy={state.phase === "loading" || isRefreshing}
        hasPendingChanges={hasPendingChanges}
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시`
            : "조회 조건을 선택하면 부적합 사건 목록을 확인합니다."
        }
      >
        <Input
          data-tour="list-search"
          aria-label="부적합 사건 검색"
          value={draft.q ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, q: event.target.value })
          }
          id="incident-q"
          label="검색"
          name="q"
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
          value={
            draft.status?.length === 1 ? (draft.status[0] ?? "all") : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeIncidentsSearch(draft, {
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
            draft.sourceType?.length === 1
              ? (draft.sourceType[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            setDraft(
              mergeIncidentsSearch(draft, {
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
      </FilterBar>
      <DataTable
        loading={state.phase === "loading"}
        loadingLabel="부적합 사건 조회 중"
        loadingRows={pageSize}
        minimumRows={pageSize}
        emptyContent={
          state.phase === "error" ? (
            <ErrorState
              description={state.message}
              action={<Button onClick={() => reload()}>다시 시도</Button>}
            />
          ) : hasActiveFilter ? (
            <EmptyState
              title="조건에 맞는 부적합 사건이 없습니다"
              description="조회 조건을 초기화하거나 다른 조건으로 확인해 주세요."
              action={<Button variant="secondary" onClick={reset}>조건 초기화</Button>}
            />
          ) : (
            <EmptyState
              title="부적합 사건이 없습니다"
              description="사후 품질 문제가 발견되면 이 화면에서 사건을 등록하고 격리를 관리합니다."
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
        caption="부적합 사건 목록"
        columns={columns}
        emptyMessage="조건에 맞는 부적합 사건이 없습니다."
        getRowKey={(row) => row.id}
        tourRecord="incident"
        rows={state.phase === "success" ? state.items : []}
      />
      <ActionSheet
        open={canRegister && registerOpen}
        onOpenChange={setRegisterOpen}
        title="부적합 사건 등록"
        description="발견한 문제와 영향을 받는 대상을 기록하세요."
      >
        {canRegister ? (
          registerOpen ? (
            <QualityIncidentRegisterPanel
              csrfToken={csrfToken}
              onDone={() => {
                setRegisterOpen(false);
                reload();
              }}
            />
          ) : null
        ) : null}
      </ActionSheet>
    </Main>
  );
}
