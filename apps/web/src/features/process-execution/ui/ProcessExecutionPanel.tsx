import { useNavigationSafety } from "@/shared/lib";
import { useState } from "react";
import {
  completeProcessStep,
  startProcessStep,
} from "../api/process-execution-commands";
import { ApiRequestError } from "@/shared/api";
import { Button, Input, Panel, FormActions } from "@/shared/ui";

export interface ExecutionTarget {
  stepId: string;
  workOrderNumber: string;
  processStepName: string;
  productionLotNumber: string;
  plannedQuantity: number;
  outputQuantityLimit: number | null;
}

interface ProcessExecutionPanelProps {
  target: ExecutionTarget;
  csrfToken: string;
  onDone: () => void;
}

export function ProcessExecutionPanel({
  target,
  csrfToken,
  onDone,
}: ProcessExecutionPanelProps) {
  const [goodQuantity, setGoodQuantity] = useState(
    target.outputQuantityLimit === null
      ? ""
      : String(target.outputQuantityLimit),
  );
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [memo, setMemo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNavigationSafety(
    goodQuantity !==
      (target.outputQuantityLimit === null
        ? ""
        : String(target.outputQuantityLimit)) ||
      defectQuantity !== "0" ||
      memo !== "",
    pending,
  );

  const total = Number(goodQuantity) + Number(defectQuantity);
  const valid =
    goodQuantity.trim() !== "" &&
    defectQuantity.trim() !== "" &&
    Number.isSafeInteger(Number(goodQuantity)) &&
    Number(goodQuantity) >= 0 &&
    Number.isSafeInteger(Number(defectQuantity)) &&
    Number(defectQuantity) >= 0 &&
    target.outputQuantityLimit !== null &&
    target.outputQuantityLimit > 0 &&
    total === target.outputQuantityLimit;

  async function submit() {
    if (pending || !valid) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await completeProcessStep(
        target.stepId,
        {
          goodQuantity: Number(goodQuantity),
          defectQuantity: Number(defectQuantity),
          ...(memo.trim() === "" ? {} : { memo: memo.trim() }),
        },
        csrfToken,
      );
      onDone();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "공정 완료를 처리하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <Panel
      ariaLabel="공정 완료 실적 입력"
      description="양품과 불량 수량을 기록합니다. 다음 공정은 자재와 검사 조건을 충족하면 실행할 수 있습니다."
      headingLevel="h2"
      title={`완료 실적 입력 · ${target.workOrderNumber} ${target.processStepName} (${target.productionLotNumber})`}
    >
      <p className="mb-3 text-sm text-text-muted" role="status">
        {target.outputQuantityLimit === null
          ? "선행 공정의 완료 실적을 먼저 확인해 주세요."
          : `이번 공정 투입량 ${target.outputQuantityLimit}개 · 양품과 불량 합계가 투입량과 같아야 합니다. 현재 합계 ${total}개`}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-28">
          <Input
            id="complete-good"
            data-tour="execution-good"
            label="양품"
            min={0}
            max={target.outputQuantityLimit ?? undefined}
            step={1}
            name="goodQuantity"
            onChange={(event) => setGoodQuantity(event.target.value)}
            type="number"
            value={goodQuantity}
          />
        </div>
        <div className="min-w-0 flex-1 basis-28">
          <Input
            id="complete-defect"
            data-tour="execution-defect"
            label="불량"
            min={0}
            max={target.outputQuantityLimit ?? undefined}
            step={1}
            name="defectQuantity"
            onChange={(event) => setDefectQuantity(event.target.value)}
            type="number"
            value={defectQuantity}
          />
        </div>
        <div className="min-w-0 basis-full">
          <Input
            hint="선택 사항입니다."
            id="complete-memo"
            data-tour="execution-memo"
            label="메모"
            name="memo"
            maxLength={300}
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </div>
      </div>
      <FormActions>
        <Button variant="secondary" onClick={onDone}>
          취소
        </Button>
        <Button
          disabled={pending || !valid}
          loading={pending}
          onClick={() => void submit()}
        >
          완료 확정
        </Button>
      </FormActions>
      {error !== null ? (
        <p className="mt-3 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

interface StartActionProps {
  target: ExecutionTarget;
  csrfToken: string;
  onDone: () => void;
}

export function StartProcessAction({
  target,
  csrfToken,
  onDone,
}: StartActionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNavigationSafety(false, pending);

  async function run() {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await startProcessStep(target.stepId, csrfToken);
      onDone();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "공정 시작을 처리하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button loading={pending} onClick={() => void run()}>
        시작
      </Button>
      {error !== null ? (
        <span className="text-xs text-danger-strong">{error}</span>
      ) : null}
    </span>
  );
}
