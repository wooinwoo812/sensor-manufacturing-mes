import { useState } from "react";
import {
  createWorkOrder,
  fetchWorkOrderProducts,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  type WorkOrderProduct,
} from "@/entities/work-order";
import { ApiRequestError } from "@/shared/api";
import {
  Button,
  ErrorState,
  ContentGrid,
  FormFields,
  FormActions,
  KeyValue,
  KeyValueGrid,
  Notice,
  Panel,
  Input,
  PageHeading,
  Select,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";
import { useNavigationSafety } from "@/shared/lib";
import { useLoadState } from "@/shared/lib";

interface WorkOrderCreatePageProps {
  csrfToken: string;
  onCreated: (workOrderId: string) => void;
  onCancel: () => void;
}

function todayPlus(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function WorkOrderCreatePage({
  csrfToken,
  onCreated,
  onCancel,
}: WorkOrderCreatePageProps) {
  const { state, reload } = useLoadState<{ products: WorkOrderProduct[] }>(
    "work-order-products",
    (signal) =>
      fetchWorkOrderProducts(signal).then((response) => ({
        products: response.items,
      })),
    "제품 목록을 불러오지 못했습니다.",
  );
  const [selectedProductCode, setProductCode] = useState<string>("");
  const products = state.phase === "success" ? state.products : [];
  const productCode = selectedProductCode || products[0]?.code || "";
  const [plannedQuantity, setPlannedQuantity] = useState("100");
  const [initialDueDate] = useState(() => todayPlus(7));
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [priority, setPriority] = useState("NORMAL");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNavigationSafety(
    selectedProductCode !== "" ||
      plannedQuantity !== "100" ||
      dueDate !== initialDueDate ||
      priority !== "NORMAL" ||
      memo !== "",
    submitting,
  );

  const selectedProduct = products.find(
    (product) => product.code === productCode,
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        back={{ label: "작업지시 목록", onClick: onCancel }}
        description="생산할 제품과 수량, 납기를 정해 초안 작업지시를 만듭니다."
        eyebrow="새 작업지시"
        meta={<span>가상 데모 데이터</span>}
        title="작업지시 생성"
      />

      {state.phase === "loading" ? (
        <div className="space-y-2" aria-label="제품 목록 조회 중" role="status">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : state.phase === "error" ? (
        <ErrorState
          title="제품 목록을 불러오지 못했습니다"
          description={state.message}
          action={<Button onClick={reload}>다시 시도</Button>}
        />
      ) : products.length === 0 ? (
        <ErrorState
          title="등록된 제품이 없습니다"
          description="제품 기준정보가 등록된 후 작업지시를 생성할 수 있습니다."
        />
      ) : (
        <ContentGrid aside>
          <Panel
            title="생산 계획 입력"
            description="필수 정보를 입력하고 초안으로 저장하세요."
          >
            <form
              className="min-w-0"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (submitting) {
                  return;
                }
                setSubmitting(true);
                setError(null);
                createWorkOrder(
                  {
                    productCode,
                    plannedQuantity: Number(plannedQuantity),
                    dueDate,
                    priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
                    ...(memo.trim() === "" ? {} : { memo: memo.trim() }),
                  },
                  csrfToken,
                )
                  .then((detail) => {
                    onCreated(detail.id);
                  })
                  .catch((cause: unknown) => {
                    setError(
                      cause instanceof ApiRequestError
                        ? cause.message
                        : "작업지시를 생성하지 못했습니다.",
                    );
                    setSubmitting(false);
                  });
              }}
            >
              <FormFields>
                <div className="sm:col-span-2">
                  <Select
                    label="제품"
                    tourAnchor="plan-product"
                    options={products.map((product) => ({
                      label: `${product.name} (${product.code})`,
                      value: product.code,
                    }))}
                    value={productCode}
                    onValueChange={setProductCode}
                  />
                </div>
                <Input
                  id="work-order-quantity"
                  data-tour="plan-quantity"
                  label="계획수량"
                  min={1}
                  name="plannedQuantity"
                  onChange={(event) => setPlannedQuantity(event.target.value)}
                  required
                  type="number"
                  value={plannedQuantity}
                />
                <Input
                  id="work-order-due"
                  data-tour="plan-due"
                  label="납기 (서울 기준)"
                  min={todayPlus(0)}
                  name="dueDate"
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                  type="date"
                  value={dueDate}
                />
                <Select
                  label="우선순위"
                  tourAnchor="plan-priority"
                  options={WORK_ORDER_PRIORITIES.map((value) => ({
                    label: WORK_ORDER_PRIORITY_LABELS[value],
                    value,
                  }))}
                  value={priority}
                  onValueChange={setPriority}
                />
                <div className="sm:col-span-2">
                  <Input
                    hint="선택 사항입니다."
                    id="work-order-memo"
                    label="메모"
                    name="memo"
                    onChange={(event) => setMemo(event.target.value)}
                    value={memo}
                  />
                </div>
              </FormFields>
              {error !== null ? (
                <p
                  role="alert"
                  className="mt-4 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong"
                >
                  {error}
                </p>
              ) : null}
              <FormActions>
                <Button
                  disabled={submitting}
                  loading={submitting}
                  type="submit"
                >
                  초안 생성
                </Button>
                <p className="text-xs text-text-muted">
                  생성 즉시 감사 이력이 기록됩니다. 발행은 상세 화면에서 별도
                  확정합니다.
                </p>
              </FormActions>
            </form>
          </Panel>
          <Panel
            title="입력 내용 확인"
            tourAnchor="plan-review"
            description="저장 전 계획을 한 번 더 확인하세요."
            bodyClassName="grid gap-6"
          >
            <KeyValueGrid columns={2}>
              <KeyValue label="선택 제품" strong>
                {selectedProduct?.name ?? "제품을 선택하세요"}
              </KeyValue>
              <KeyValue label="계획수량" size="lg">
                {Number(plannedQuantity).toLocaleString("ko-KR")}{" "}
                {selectedProduct?.unit}
              </KeyValue>
              <KeyValue label="납기">{dueDate || "미입력"}</KeyValue>
              <KeyValue label="우선순위">
                {
                  WORK_ORDER_PRIORITY_LABELS[
                    priority as keyof typeof WORK_ORDER_PRIORITY_LABELS
                  ]
                }
              </KeyValue>
            </KeyValueGrid>
            <Notice>
              초안은 생산 실행 전의 준비 단계입니다. 생성 후 상세 화면에서
              내용을 검토하고 발행을 확정합니다.
            </Notice>
          </Panel>
        </ContentGrid>
      )}
    </Main>
  );
}
