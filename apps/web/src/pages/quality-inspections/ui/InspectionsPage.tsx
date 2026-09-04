import { useEffect, useMemo, useState } from "react";
import {
  fetchInspections,
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
  type InspectionListItem,
} from "@/entities/inspection";
import { InspectionVerdictPanel } from "@/features/inspection-verdict";
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
  Skeleton,
  type BadgeTone,
  type DataTableColumn,
} from "@/shared/ui";
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

const PAGE_SIZE = 20;

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      items: InspectionListItem[];
      total: number;
      page: number;
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
  const [reloadCount, setReloadCount] = useState(0);
  const [verdictTarget, setVerdictTarget] = useState<InspectionListItem | null>(null);
  const [result, setResult] = useState<{
    key: string;
    reload: number;
    state: Exclude<LoadState, { phase: "loading" }>;
  } | null>(null);

  useEffect(() => {
    const searchValue = JSON.parse(searchKey) as InspectionsSearch;
    const controller = new AbortController();
    let active = true;
    fetchInspections(toInspectionsParams(searchValue), controller.signal)
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
                : "검사 목록을 불러오지 못했습니다.",
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

  const columns = useMemo<DataTableColumn<InspectionListItem>[]>(
    () => [
      {
        key: "inspectionNumber",
        header: "검사",
        cell: (row) => (
          <button
            className="font-mono text-xs font-bold text-accent-strong underline-offset-4 hover:underline"
            onClick={() => onOpenDetail(row.id)}
            type="button"
          >
            {row.inspectionNumber}
          </button>
        ),
      },
      {
        key: "productionLotNumber",
        header: "생산 LOT",
        cell: (row) => (
          <span className="font-mono text-xs text-text-muted">
            {row.productionLotNumber}
          </span>
        ),
      },
      {
        key: "processStepName",
        header: "공정",
        cell: (row) => row.processStepName,
      },
      {
        key: "gate",
        header: "게이트",
        cell: (row) => (
          <Badge tone={row.gate === "LOT_COMPLETE" ? "info" : "neutral"}>
            {INSPECTION_GATE_LABELS[row.gate]}
          </Badge>
        ),
      },
      {
        key: "specName",
        header: "검사 규격",
        cell: (row) => (
          <span className="block min-w-40 text-sm text-text-strong">
            {row.specName}
          </span>
        ),
      },
      {
        key: "workOrderNumber",
        header: "작업지시",
        cell: (row) => (
          <span className="font-mono text-xs text-text-muted">
            {row.workOrderNumber}
          </span>
        ),
      },
      {
        key: "executionStatus",
        header: "실행 상태",
        cell: (row) => (
          <Badge tone={EXECUTION_TONES[row.executionStatus] ?? "neutral"}>
            {INSPECTION_EXECUTION_STATUS_LABELS[row.executionStatus]}
          </Badge>
        ),
      },
      {
        key: "verdict",
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
              header: "행동",
              cell: (row: InspectionListItem) =>
                row.executionStatus === "PENDING" ||
                row.executionStatus === "IN_PROGRESS" ? (
                  <Button variant="secondary" onClick={() => setVerdictTarget(row)}>
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

  const currentPage = state.phase === "success" ? state.page : search.page ?? 1;
  const totalPages =
    state.phase === "success"
      ? Math.max(1, Math.ceil(state.total / PAGE_SIZE))
      : 1;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="검사 대기·진행·판정 결과를 게이트와 규격 기준으로 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="품질 검사"
      />

      <FilterBar
        resultLabel={
          state.phase === "success"
            ? `총 ${state.total.toLocaleString("ko-KR")}건 중 ${state.items.length.toLocaleString("ko-KR")}건 표시 (등록 순서)`
            : "조회 조건을 선택하면 검사 목록을 확인합니다."
        }
      >
        <Input
          aria-label="검사 검색"
          defaultValue={search.q}
          id="inspection-q"
          label="검색"
          name="q"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const value = event.currentTarget.value.trim();
              onSearchChange(mergeInspectionsSearch(search, {q: value === "" ? undefined : value,
                page: undefined,}));
            }
          }}
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
            search.executionStatus?.length === 1
              ? (search.executionStatus[0] ?? "all")
              : "all"
          }
          onValueChange={(value) =>
            onSearchChange(mergeInspectionsSearch(search, {executionStatus:
                value === "all"
                  ? undefined
                  : [
                      value as keyof typeof INSPECTION_EXECUTION_STATUS_LABELS,
                    ],
              page: undefined,}))
          }
        />
        <Select
          label="판정"
          options={[
            { label: "전체 판정", value: "all" },
            ...Object.entries(INSPECTION_VERDICT_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={search.verdict?.length === 1 ? (search.verdict[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeInspectionsSearch(search, {verdict:
                value === "all"
                  ? undefined
                  : [value as keyof typeof INSPECTION_VERDICT_LABELS],
              page: undefined,}))
          }
        />
        <Select
          label="게이트"
          options={[
            { label: "전체 게이트", value: "all" },
            ...Object.entries(INSPECTION_GATE_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={search.gate?.length === 1 ? (search.gate[0] ?? "all") : "all"}
          onValueChange={(value) =>
            onSearchChange(mergeInspectionsSearch(search, {gate: value === "all" ? undefined : [value as keyof typeof INSPECTION_GATE_LABELS],
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
        <div className="space-y-2" aria-label="검사 목록 조회 중" role="status">
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
          title="조건에 맞는 검사가 없습니다"
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
          {verdictTarget !== null ? (
            <InspectionVerdictPanel
              csrfToken={csrfToken}
              onDone={() => {
                setVerdictTarget(null);
                setReloadCount((count) => count + 1);
              }}
              target={{
                inspectionId: verdictTarget.id,
                inspectionNumber: verdictTarget.inspectionNumber,
                specName: verdictTarget.specName,
                productionLotNumber: verdictTarget.productionLotNumber,
              }}
            />
          ) : null}
          <DataTable
            caption="품질 검사 목록"
            columns={columns}
            emptyMessage="조건에 맞는 검사가 없습니다."
            getRowKey={(row) => row.id}
            rows={state.items}
          />
          <Pagination
            currentPage={currentPage}
            label="검사 목록 페이지 탐색"
            onPageChange={(page) => onSearchChange(mergeInspectionsSearch(search, { page }))}
            totalPages={totalPages}
          />
        </>
      )}
    </Main>
  );
}
