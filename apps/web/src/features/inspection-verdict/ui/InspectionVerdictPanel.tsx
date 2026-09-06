import { useNavigationSafety } from "@/shared/lib";
import { useState } from "react";
import { verdictInspection } from "../api/inspection-verdict";
import { ApiRequestError } from "@/shared/api";
import { Badge, Button, Input, Panel, Select, FormActions } from "@/shared/ui";

export interface InspectionVerdictTarget {
  inspectionId: string;
  inspectionNumber: string;
  specName: string;
  productionLotNumber: string;
}

interface InspectionVerdictPanelProps {
  target: InspectionVerdictTarget;
  csrfToken: string;
  onDone: () => void;
  review?: boolean;
}

const VERDICT_OPTIONS = [
  { label: "합격 (PASS)", value: "PASS" },
  { label: "불합격 (FAIL)", value: "FAIL" },
  { label: "보류 (HOLD)", value: "HOLD" },
] as const;

export function InspectionVerdictPanel({
  target,
  csrfToken,
  onDone,
  review = false,
}: InspectionVerdictPanelProps) {
  const [verdict, setVerdict] = useState<string>("PASS");
  const [memo, setMemo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useNavigationSafety(verdict !== "PASS" || memo !== "", pending);

  async function submit() {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await verdictInspection(
        target.inspectionId,
        {
          verdict: verdict as "PASS" | "FAIL" | "HOLD",
          ...(memo.trim() === "" ? {} : { memo: memo.trim() }),
        },
        csrfToken,
        review,
      );
      onDone();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "판정을 처리하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <Panel
      ariaLabel={review ? "보류 검토 입력" : "검사 판정 입력"}
      description={
        review
          ? "기존 보류 판정과 사유를 보존하고, 검토 결과를 새 이력으로 기록합니다."
          : "불합격·보류는 다음 공정을 차단합니다. 판정 후에는 보류 검사만 추가 검토할 수 있습니다."
      }
      headingLevel="h2"
      title={`${review ? "보류 검토" : "판정 입력"} · ${target.specName} (${target.productionLotNumber})`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <Select
            label="판정"
            tourAnchor="inspection-verdict"
            disabled={pending}
            options={VERDICT_OPTIONS.filter(
              (option) => !review || option.value !== "HOLD",
            ).map((option) => ({ ...option }))}
            value={verdict}
            onValueChange={setVerdict}
          />
        </div>
        <div className="min-w-0 basis-56 flex-1">
          <Input
            hint={
              review || verdict !== "PASS"
                ? "검토 근거와 사유를 2~300자로 입력해 주세요."
                : "선택 사항 · 최대 300자"
            }
            maxLength={300}
            disabled={pending}
            id="verdict-memo"
            data-tour="inspection-memo"
            label={review ? "검토 사유" : "판정 사유"}
            name="verdictMemo"
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </div>
      </div>
      <FormActions>
        <Button variant="secondary" disabled={pending} onClick={onDone}>
          취소
        </Button>
        <Button
          loading={pending}
          disabled={(review || verdict !== "PASS") && memo.trim().length < 2}
          onClick={() => void submit()}
        >
          {review ? "검토 결과 확정" : "판정 확정"}
        </Button>
      </FormActions>
      {verdict !== "PASS" ? (
        <p className="mt-3">
          <Badge tone={verdict === "FAIL" ? "danger" : "warning"}>
            {verdict === "FAIL"
              ? "불합격으로 후속 진행을 차단합니다"
              : "검토 결과가 확정될 때까지 진행을 차단합니다"}
          </Badge>
        </p>
      ) : null}
      {error !== null ? (
        <p className="mt-3 rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
