import { useState } from "react";
import { registerQualityIncident } from "../api/quality-incident-register";
import { QUALITY_INCIDENT_SOURCE_TYPE_LABELS } from "@/entities/quality-incident";
import { ApiRequestError } from "@/shared/api";
import { Button, Input, Select } from "@/shared/ui";

interface QualityIncidentRegisterPanelProps {
  csrfToken: string;
  onDone: () => void;
}

export function QualityIncidentRegisterPanel({
  csrfToken,
  onDone,
}: QualityIncidentRegisterPanelProps) {
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<string>("MATERIAL_LOT");
  const [sourceLotNumber, setSourceLotNumber] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (pending) {
      return;
    }
    if (title.trim().length < 4) {
      setError("사건 제목은 4자 이상이어야 합니다.");
      return;
    }
    if (sourceLotNumber.trim() === "") {
      setError("사건 대상 식별번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await registerQualityIncident(
        {
          title: title.trim(),
          sourceType: sourceType as "MATERIAL_LOT" | "PRODUCTION_LOT" | "FINISHED_UNIT",
          sourceLotNumber: sourceLotNumber.trim(),
          ...(description.trim() === "" ? {} : { description: description.trim() }),
        },
        csrfToken,
      );
      onDone();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "부적합 사건 등록을 처리하지 못했습니다.",
      );
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-panel border border-border bg-surface p-4"
      aria-label="부적합 사건 등록"
    >
      <p className="text-sm font-semibold">부적합 사건 등록</p>
      <p className="mt-1 text-xs text-text-muted">
        자재 LOT 사건은 등록 즉시 격리(QUARANTINED)되어 예약·투입이 차단되며 감사
        이력에 기록됩니다.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            id="incident-title"
            label="사건 제목"
            name="incidentTitle"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="min-w-44">
          <Select
            label="대상 유형"
            options={Object.entries(QUALITY_INCIDENT_SOURCE_TYPE_LABELS).map(
              ([value, label]) => ({ label, value }),
            )}
            value={sourceType}
            onValueChange={setSourceType}
          />
        </div>
        <div>
          <Input
            hint="예: ML-2026-0301"
            id="incident-source-lot"
            label="대상 식별번호"
            name="incidentSourceLot"
            onChange={(event) => setSourceLotNumber(event.target.value)}
            value={sourceLotNumber}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            hint="선택 사항입니다."
            id="incident-description"
            label="설명"
            name="incidentDescription"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button loading={pending} onClick={() => void submit()}>
          사건 등록
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
