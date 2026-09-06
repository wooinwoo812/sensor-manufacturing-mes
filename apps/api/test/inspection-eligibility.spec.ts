import { describe, expect, it } from "vitest";
import { inspectionEligibility } from "../src/inspections/inspection-eligibility.js";
const inspection = { productionLotNumber: "LOT-A", processStepName: "절단", gate: "ROUTE_ADVANCE", executionStatus: "PENDING", verdict: null };
const steps = [{ productionLotNumber: "LOT-A", processStepName: "절단", sequence: 10, readiness: "READY" }, { productionLotNumber: "LOT-A", processStepName: "포장", sequence: 20, readiness: "WAITING" }];
describe("inspection eligibility", () => {
  it("blocks a verdict before the inspected process starts", () => {
    expect(inspectionEligibility(inspection, "RELEASED", steps)).toMatchObject({ canVerdict: false, canReview: false });
    expect(inspectionEligibility(inspection, "IN_PROGRESS", [{ ...steps[0]!, readiness: "IN_PROGRESS" }]).canVerdict).toBe(true);
  });
  it("requires every step in the inspected LOT before final verdict", () => {
    const final = { ...inspection, gate: "LOT_COMPLETE" };
    expect(inspectionEligibility(final, "IN_PROGRESS", [{ ...steps[0]!, readiness: "COMPLETED" }, steps[1]!]).canVerdict).toBe(false);
    expect(inspectionEligibility(final, "IN_PROGRESS", steps.map(step => ({ ...step, readiness: "COMPLETED" }))).canVerdict).toBe(true);
  });
  it("prevents review after a downstream process started", () => {
    const held = { ...inspection, executionStatus: "COMPLETED", verdict: "HOLD" };
    expect(inspectionEligibility(held, "IN_PROGRESS", [{ ...steps[0]!, readiness: "COMPLETED" }, { ...steps[1]!, readiness: "IN_PROGRESS" }]).canReview).toBe(false);
  });
  it("allows final HOLD review when all LOT processes are complete", () => {
    expect(inspectionEligibility({ ...inspection, gate: "LOT_COMPLETE", executionStatus: "COMPLETED", verdict: "HOLD" }, "IN_PROGRESS", steps.map(step => ({ ...step, readiness: "COMPLETED" })))).toMatchObject({ canVerdict: false, canReview: true });
  });
  it.each(["DRAFT", "CANCELLED", "COMPLETED"])("rejects commands on a %s order", status => {
    expect(inspectionEligibility(inspection, status, [{ ...steps[0]!, readiness: "COMPLETED" }]).canVerdict).toBe(false);
  });
});
