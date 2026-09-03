import { useEffect, useState } from "react";
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
  Input,
  PageHeading,
  Select,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

interface WorkOrderCreatePageProps {
  csrfToken: string;
  onCreated: (workOrderId: string) => void;
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
}: WorkOrderCreatePageProps) {
  const [products, setProducts] = useState<WorkOrderProduct[] | null>(null);
  const [productCode, setProductCode] = useState<string>("");
  const [plannedQuantity, setPlannedQuantity] = useState("100");
  const [dueDate, setDueDate] = useState(todayPlus(7));
  const [priority, setPriority] = useState("NORMAL");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchWorkOrderProducts(controller.signal)
      .then((response) => {
        if (!active) {
          return;
        }
        setProducts(response.items);
        setProductCode((current) => current || (response.items[0]?.code ?? ""));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setProducts([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="생산할 제품과 수량, 납기를 정해 초안 작업지시를 만듭니다."
        meta={<span>가상 데모 데이터</span>}
        title="작업지시 생성"
      />

      {products === null ? (
        <div className="space-y-2" aria-label="제품 목록 조회 중" role="status">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form
          className="max-w-xl space-y-4"
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
          <Select
            label="제품"
            options={products.map((product) => ({
              label: `${product.name} (${product.code})`,
              value: product.code,
            }))}
            value={productCode}
            onValueChange={setProductCode}
          />
          <Input
            id="work-order-quantity"
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
            options={WORK_ORDER_PRIORITIES.map((value) => ({
              label: WORK_ORDER_PRIORITY_LABELS[value],
              value,
            }))}
            value={priority}
            onValueChange={setPriority}
          />
          <Input
            hint="선택 사항입니다."
            id="work-order-memo"
            label="메모"
            name="memo"
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
          {error !== null ? (
            <p className="rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button disabled={submitting} loading={submitting} type="submit">
              초안 생성
            </Button>
            <p className="text-xs text-text-muted">
              생성 즉시 감사 이력이 기록됩니다. 발행은 상세 화면에서 별도 확정합니다.
            </p>
          </div>
        </form>
      )}
      {products !== null && products.length === 0 ? (
        <ErrorState title="제품 목록을 불러오지 못했습니다" />
      ) : null}
    </Main>
  );
}
