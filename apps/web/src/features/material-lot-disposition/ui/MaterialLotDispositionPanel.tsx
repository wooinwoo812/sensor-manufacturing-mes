import { useState } from "react";
import {
  decideMaterialLotDisposition,
  type MaterialLotDispositionTarget,
} from "../api/material-lot-disposition";
import { MATERIAL_LOT_DISPOSITION_LABELS } from "@/entities/material-lot";
import { ApiRequestError } from "@/shared/api";
import { Badge, Button, Input, Select } from "@/shared/ui";

const DISPOSITION_OPTIONS = [
  { label: "합격 (ACCEPTED)", value: "ACCEPTED" },
  { label: "보류 (HOLD)", value: "HOLD" },
  { label: "거부·폐기 (REJECTED)", value: "REJECTED" },
] as const;

interface MaterialLotDispositionPanelProps {
  target: MaterialLotDispositionTarget;
  csrfToken: string;
  onDone: () => void;
}

export function MaterialLotDispositionPanel({
  target,
  csrfToken,
  onDone,
}: MaterialLotDispositionPanelProps) {
  const [disposition, setDisposition] = useState<string>("ACCEPTED");
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
      await decideMaterialLotDisposition(
        target.lotId,
        {
          disposition: disposition as "ACCEPTED" | "HOLD" | "REJECTED",
          ...(memo.trim() === "" ? {} : { memo: memo.trim() }),
        },
        csrfToken,
      );
      onDone();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "품질 처분을 처리하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-panel border border-border bg-surface p-4"
      aria-label="자재 LOT 품질 처분"
    >
      <p className="text-sm font-semibold">
        {`${target.materialName} · ${target.lotNumber} (재고 ${target.onHand.toLocaleString("ko-KR")}${target.unit})`}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        현재 품질 상태{" "}
        <Badge tone="neutral">
          {MATERIAL_LOT_DISPOSITION_LABELS[
            target.currentDisposition as keyof typeof MATERIAL_LOT_DISPOSITION_LABELS
          ] ?? target.currentDisposition}
        </Badge>{" "}
        — 처분 확정 시 감사 이력에 기록됩니다. 합격 상태의 사후 문제는 부적합 사건
        등록으로 격리한 뒤 처분해야 합니다.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <Select
            label="처분"
            options={DISPOSITION_OPTIONS.map((option) => ({ ...option }))}
            value={disposition}
            onValueChange={setDisposition}
          />
        </div>
        <div className="min-w-56 flex-1">
          <Input
            hint="선택 사항입니다."
            id="disposition-memo"
            label="처분 사유"
            name="dispositionMemo"
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </div>
        <Button loading={pending} onClick={() => void submit()}>
          처분 확정
        </Button>
        <Button variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
      {disposition === "REJECTED" ? (
        <p className="mt-3">
          <Badge tone="danger">
            거부·폐기 처분은 잔여 재고를 폐기 수량으로 이관하며 되돌릴 수 없습니다
          </Badge>
        </p>
      ) : null}
      {error !== null ? (
        <p className="mt-3 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
