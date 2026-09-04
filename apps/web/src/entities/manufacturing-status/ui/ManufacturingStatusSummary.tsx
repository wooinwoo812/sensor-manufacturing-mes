import { Badge, type BadgeTone } from "@/shared/ui";

export type ProductionProgress = "planned" | "ready" | "in-progress" | "completed";
export type InspectionDecision = "not-inspected" | "pass" | "fail" | "hold";
export type QualityDisposition =
  | "PENDING"
  | "ACCEPTED"
  | "HOLD"
  | "QUARANTINED"
  | "REJECTED";

interface ManufacturingStatusSummaryProps {
  production: ProductionProgress;
  inspection: InspectionDecision;
  disposition: QualityDisposition;
}

const productionConfig: Record<ProductionProgress, { label: string; tone: BadgeTone }> = {
  planned: { label: "계획", tone: "neutral" },
  ready: { label: "준비", tone: "info" },
  "in-progress": { label: "진행 중", tone: "warning" },
  completed: { label: "완료", tone: "success" },
};

const inspectionConfig: Record<InspectionDecision, { label: string; tone: BadgeTone }> = {
  "not-inspected": { label: "미검사", tone: "neutral" },
  pass: { label: "합격", tone: "success" },
  fail: { label: "불합격", tone: "danger" },
  hold: { label: "판정 보류", tone: "warning" },
};

const dispositionConfig: Record<QualityDisposition, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "검사 대기", tone: "neutral" },
  ACCEPTED: { label: "허입", tone: "success" },
  HOLD: { label: "보류", tone: "warning" },
  QUARANTINED: { label: "격리", tone: "danger" },
  REJECTED: { label: "거부", tone: "danger" },
};

export function ManufacturingStatusSummary({
  disposition,
  inspection,
  production,
}: ManufacturingStatusSummaryProps) {
  return (
    <div aria-label="제조 상태 요약" role="group">
      <dl className="flex flex-wrap gap-x-6 gap-y-3">
        <StatusAxis label="생산 진행" config={productionConfig[production]} />
        <StatusAxis label="최근 검사" config={inspectionConfig[inspection]} />
        <StatusAxis label="현재 품질" config={dispositionConfig[disposition]} />
      </dl>
    </div>
  );
}

function StatusAxis({
  config,
  label,
}: {
  config: { label: string; tone: BadgeTone };
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd>
        <Badge tone={config.tone}>{config.label}</Badge>
      </dd>
    </div>
  );
}
