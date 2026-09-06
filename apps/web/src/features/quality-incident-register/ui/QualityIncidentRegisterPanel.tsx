import { useNavigationSafety } from "@/shared/lib";
import { useState } from "react";
import { registerQualityIncident } from "../api/quality-incident-register";
import { QUALITY_INCIDENT_SOURCE_TYPE_LABELS } from "@/entities/quality-incident";
import { ApiRequestError } from "@/shared/api";
import {
  Button,
  FormActions,
  FormFields,
  Input,
  Notice,
  Panel,
  Select,
} from "@/shared/ui";

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

  useNavigationSafety(
    title !== "" ||
      sourceType !== "MATERIAL_LOT" ||
      sourceLotNumber !== "" ||
      description !== "",
    pending,
  );

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
          sourceType: sourceType as
            | "MATERIAL_LOT"
            | "PRODUCTION_LOT"
            | "FINISHED_UNIT",
          sourceLotNumber: sourceLotNumber.trim(),
          ...(description.trim() === ""
            ? {}
            : { description: description.trim() }),
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
    <Panel
      ariaLabel="부적합 사건 등록"
      title="부적합 사건 등록"
      description="발견한 문제와 영향 대상을 기록합니다."
      bodyClassName="grid gap-5"
    >
      <Notice tone="warning">
        자재 LOT 사건은 등록 즉시 격리되어 예약·투입이 차단되며 감사 이력에
        기록됩니다.
      </Notice>
      <FormFields>
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <Input
            hint="선택 사항입니다."
            id="incident-description"
            label="설명"
            name="incidentDescription"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>
      </FormFields>
      <FormActions>
        <Button variant="secondary" onClick={onDone}>
          취소
        </Button>
        <Button loading={pending} onClick={() => void submit()}>
          사건 등록
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
