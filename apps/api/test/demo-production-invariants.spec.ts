import { describe, expect, it } from "vitest";
import { DEMO_PROCESS_STEPS } from "../prisma/demo-process-steps.js";
import { DEMO_WORK_ORDERS } from "../prisma/demo-work-orders.js";
import { DEMO_INSPECTIONS } from "../prisma/demo-inspections.js";

describe("demonstration production records", () => {
  it("completed operations have conserved quantities and ordered timestamps", () => {
    for (const step of DEMO_PROCESS_STEPS.filter((row) => row.readiness === "COMPLETED")) {
      const order = DEMO_WORK_ORDERS.find((row) => row.orderNumber === step.workOrderNumber)!;
      expect(step.goodQuantity! + step.defectQuantity!).toBe(order.plannedQuantity);
      expect(step.startedAt!.getTime()).toBeLessThan(step.completedAt!.getTime());
    }
  });
  it("ready steps have completed predecessors and passing route inspections", () => {
    for (const step of DEMO_PROCESS_STEPS.filter((row) => row.readiness === "READY")) {
      const prior = DEMO_PROCESS_STEPS.filter((row) => row.productionLotNumber === step.productionLotNumber && row.sequence < step.sequence);
      expect(prior.every((row) => row.readiness === "COMPLETED")).toBe(true);
      const checks = DEMO_INSPECTIONS.filter((row) => row.productionLotNumber === step.productionLotNumber && row.gate === "ROUTE_ADVANCE" && row.executionStatus !== "CANCELLED" && prior.some((p) => p.processStepName === row.processStepName));
      expect(checks.every((row) => row.executionStatus === "COMPLETED" && row.verdict === "PASS")).toBe(true);
    }
  });
  it("progress describes completed operations in the available route history", () => {
    for (const order of DEMO_WORK_ORDERS) {
      const steps = DEMO_PROCESS_STEPS.filter((row) => row.workOrderNumber === order.orderNumber);
      const progress = steps.length === 0 ? 0 : Math.round(steps.filter((row) => row.readiness === "COMPLETED").length / steps.length * 100);
      expect(order.progressPercent).toBe(progress);
    }
  });
});
