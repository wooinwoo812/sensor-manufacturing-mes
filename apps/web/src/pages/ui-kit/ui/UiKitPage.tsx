import {
  AlertTriangle,
  ClipboardCheck,
  Factory,
  PackageSearch,
  RotateCcw,
  Search,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ManufacturingStatusSummary } from "@/entities/manufacturing-status";
import {
  Badge,
  Button,
  ConfirmDialog,
  ConflictState,
  DataTable,
  DateInput,
  EmptyState,
  ErrorState,
  FilterBar,
  ForbiddenState,
  Input,
  MetricCard,
  NumberInput,
  PageHeading,
  PriorityBadge,
  Select,
  Skeleton,
  Toast,
  type DataTableColumn,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

interface WorkOrderRow {
  id: string;
  product: string;
  quantity: number;
  dueDate: string;
  progress: "ready" | "in-progress";
}

const workOrders: WorkOrderRow[] = [
  {
    id: "WO-260901-004",
    product: "광학 센서 모듈 A",
    quantity: 120,
    dueDate: "09-04",
    progress: "in-progress",
  },
  {
    id: "WO-260901-007",
    product: "열상 센서 모듈 B",
    quantity: 40,
    dueDate: "09-03",
    progress: "ready",
  },
];

const columns: DataTableColumn<WorkOrderRow>[] = [
  {
    key: "id",
    header: "작업지시",
    cell: (row) => (
      <button
        className="text-sm font-semibold tabular-nums text-accent-strong underline-offset-4 hover:underline"
        type="button"
      >
        {row.id}
      </button>
    ),
  },
  { key: "product", header: "제품", cell: (row) => row.product },
  {
    key: "quantity",
    header: "계획수량",
    align: "right",
    cell: (row) => row.quantity.toLocaleString("ko-KR"),
  },
  { key: "dueDate", header: "납기", cell: (row) => row.dueDate },
  {
    key: "progress",
    header: "진행",
    cell: (row) => (
      <Badge tone={row.progress === "in-progress" ? "warning" : "info"}>
        {row.progress === "in-progress" ? "진행 중" : "준비"}
      </Badge>
    ),
  },
];

const selectOptions = [
  { label: "전체 상태", value: "all" },
  { label: "준비", value: "ready" },
  { label: "진행 중", value: "in-progress" },
  { label: "격리", value: "quarantined" },
] as const;

export function UiKitPage() {
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <Main id="main-content" tabIndex={-1} data-testid="ui-kit-page">
      <PageHeading
        description="실제 제품 화면이 공유하는 토큰·입력·상태·복구 계약을 한곳에서 검증합니다."
        title="UI 시스템 점검"
      />
      <div className="grid gap-6">
      <ShowcaseSection
        id="actions"
        title="행동과 피드백"
        description="대표·보조·위험 행동은 같은 위치와 상태 언어를 사용합니다."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setToastOpen(true)}>대표 행동</Button>
          <Button variant="secondary">보조 행동</Button>
          <Button variant="ghost">텍스트 행동</Button>
          <ConfirmDialog
            danger
            title="생산 LOT를 폐기할까요?"
            description="이 행동은 되돌릴 수 없습니다. 폐기 사유와 감사이력이 함께 기록됩니다."
            confirmLabel="폐기 확정"
            trigger={<Button variant="danger">위험 행동</Button>}
          />
          <Button loading>저장</Button>
          <Button disabled>사용 불가</Button>
        </div>
        <Toast
          description="변경 version 8이 감사이력과 함께 기록되었습니다."
          onOpenChange={setToastOpen}
          open={toastOpen}
          title="작업지시를 저장했습니다"
        />
      </ShowcaseSection>

      <ShowcaseSection
        id="inputs"
        title="업무 입력"
        description="label·도움말·오류를 입력값과 하나의 접근성 계약으로 제공합니다."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="작업지시 검색" placeholder="WO 번호 또는 제품명" />
          <NumberInput
            label="계획수량"
            defaultValue={120}
            min={0}
            hint="기준 단위: EA"
          />
          <DateInput label="납기일" defaultValue="2026-09-04" />
          <Select
            label="진행 상태"
            defaultValue="all"
            options={[...selectOptions]}
          />
          <div className="md:col-span-2">
            <Input
              label="부적합 사유"
              defaultValue="절연저항 기준 미달"
              error="최소 20자 이상의 구체적인 근거가 필요합니다."
            />
          </div>
          <Input
            label="잠긴 기준 revision"
            value="Q-FINAL rev.4"
            disabled
            readOnly
          />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="status"
        title="상태와 우선순위"
        description="생산 진행·검사 판정·품질 disposition을 하나의 종합 배지로 합치지 않습니다."
      >
        <ManufacturingStatusSummary
          production="completed"
          inspection="pass"
          disposition="QUARANTINED"
        />
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
          <Badge>대기</Badge>
          <Badge tone="info">예약 완료</Badge>
          <Badge tone="success">검사 합격</Badge>
          <Badge tone="warning">판정 보류</Badge>
          <Badge tone="danger">품질 격리</Badge>
          <PriorityBadge priority="low" />
          <PriorityBadge priority="normal" />
          <PriorityBadge priority="high" />
          <PriorityBadge priority="critical" />
        </div>
      </ShowcaseSection>

      <section className="grid gap-4 md:grid-cols-3" aria-label="운영 지표 예시">
        <MetricCard
          label="진행 중 작업지시"
          value="12"
          helper="차단 없음 10 · 확인 필요 2"
          icon={Factory}
        />
        <MetricCard
          label="검사 대기"
          value="7"
          helper="납기 임박 LOT 2건"
          icon={ClipboardCheck}
          emphasis="warning"
        />
        <MetricCard
          label="격리 대상"
          value="3"
          helper="처분 결정 대기"
          icon={AlertTriangle}
          emphasis="danger"
        />
      </section>

      <ShowcaseSection
        id="table"
        title="조회 조건과 업무 표"
        description="대표 행동과 차단 사유는 가로 스크롤 없이 읽을 수 있어야 합니다."
      >
        <FilterBar
          resultLabel="총 2건 · 기준 데이터 2026-09-02"
          actions={
            <>
              <Button size="compact" variant="ghost">
                <RotateCcw className="size-4" aria-hidden="true" />
                초기화
              </Button>
              <Button size="compact">
                <Search className="size-4" aria-hidden="true" />
                조회
              </Button>
            </>
          }
        >
          <Input hideLabel label="작업지시 검색" placeholder="번호·제품 검색" />
          <Select
            label="상태"
            defaultValue="all"
            options={[...selectOptions]}
          />
        </FilterBar>
        <div className="mt-4">
          <DataTable
            caption="작업지시 예시"
            columns={columns}
            emptyMessage="조건에 맞는 작업지시가 없습니다."
            getRowKey={(row) => row.id}
            rows={workOrders}
          />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="screen-states"
        title="화면 상태와 복구 행동"
        description="사용자 문맥을 보존하면서 다음 행동을 명시합니다."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-panel border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
            </div>
            <Skeleton className="mt-5 h-24 w-full" />
            <span className="sr-only" role="status">
              업무 데이터를 불러오는 중입니다.
            </span>
          </div>
          <EmptyState action={<Button variant="secondary">필터 초기화</Button>} />
          <ErrorState action={<Button>안전하게 다시 시도</Button>} />
          <ForbiddenState action={<Button variant="secondary">역할 전환</Button>} />
          <ConflictState action={<Button>최신값 다시 불러오기</Button>} />
        </div>
      </ShowcaseSection>

      <section className="rounded-panel border border-accent/30 bg-accent-soft p-5 text-sm leading-6 text-accent-strong">
        <div className="flex gap-3">
          <PackageSearch className="mt-1 size-5 shrink-0" aria-hidden="true" />
          <p>
            실제 제품 route가 사용하는 token과 공통 component의 정상·실패·복구
            상태 조합을 이 화면에서 함께 검증합니다.
          </p>
        </div>
      </section>
      </div>
    </Main>
  );
}

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

function ShowcaseSection({
  children,
  description,
  id,
  title,
}: ShowcaseSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      className="rounded-panel border border-border bg-surface p-5 xl:p-6"
      aria-labelledby={headingId}
    >
      <div className="mb-5 border-b border-border pb-4">
        <span className="text-xs font-semibold text-accent-strong">
          공통 컴포넌트
        </span>
        <h2 className="mt-1 text-lg font-bold text-text-strong" id={headingId}>
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
