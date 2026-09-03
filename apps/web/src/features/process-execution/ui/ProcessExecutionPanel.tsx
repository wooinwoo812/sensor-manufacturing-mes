import { useState } from "react";
import {
  completeProcessStep,
  startProcessStep,
} from "../api/process-execution-commands";
import { ApiRequestError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";

export interface ExecutionTarget {
  stepId: string;
  workOrderNumber: string;
  processStepName: string;
  productionLotNumber: string;
  plannedQuantity: number;
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
  const [goodQuantity, setGoodQuantity] = useState(String(target.plannedQuantity));
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [memo, setMemo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (pending) {
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
    <div className="rounded-panel border border-border bg-surface p-4" aria-label="공정 완료 실적 입력">
      <p className="text-sm font-semibold">
        {`${target.workOrderNumber} · ${target.processStepName} (${target.productionLotNumber})`}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        양품과 불량 수량을 기록하면 실적으로 저장되고 다음 공정이 실행 가능해집니다.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Input
            id="complete-good"
            label="양품"
            min={0}
            name="goodQuantity"
            onChange={(event) => setGoodQuantity(event.target.value)}
            type="number"
            value={goodQuantity}
          />
        </div>
        <div className="w-28">
          <Input
            id="complete-defect"
            label="불량"
            min={0}
            name="defectQuantity"
            onChange={(event) => setDefectQuantity(event.target.value)}
            type="number"
            value={defectQuantity}
          />
        </div>
        <div className="min-w-56 flex-1">
          <Input
            hint="선택 사항입니다."
            id="complete-memo"
            label="메모"
            name="memo"
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </div>
        <Button
          disabled={pending || Number(goodQuantity) + Number(defectQuantity) < 1}
          loading={pending}
          onClick={() => void submit()}
        >
          완료 확정
        </Button>
        <Button variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
      {error !== null ? (
        <p className="mt-3 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface StartActionProps {
  target: ExecutionTarget;
  csrfToken: string;
  onDone: () => void;
}

export function StartProcessAction({ target, csrfToken, onDone }: StartActionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
