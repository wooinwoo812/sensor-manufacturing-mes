import { describe, expect, it, vi } from "vitest";
import type { Prisma, ProcessStepExecution, Inspection } from "../src/generated/prisma/client.js";
import { outputQuantityLimit, refreshProductionFlow, productionTransaction } from "../src/process-executions/production-flow.js";
import type { PrismaService } from "../src/database/prisma.service.js";

function fixture() {
  const steps = [
    { id: "first", sequence: 10, productionLotNumber: "LOT-A", processStepName: "절단", readiness: "COMPLETED", goodQuantity: 115, blockedReasonCodes: [] },
    { id: "next", sequence: 20, productionLotNumber: "LOT-A", processStepName: "조립", readiness: "BLOCKED", goodQuantity: null, blockedReasonCodes: ["INSPECTION_PENDING"] },
  ] as ProcessStepExecution[];
  const inspections = [{ productionLotNumber: "LOT-A", processStepName: "절단", gate: "ROUTE_ADVANCE", executionStatus: "COMPLETED", verdict: "PASS" }] as Inspection[];
  const order = { id: "order", status: "IN_PROGRESS", plannedQuantity: 120, progressPercent: 0 };
  const tx = {
    workOrder: { findUnique: async () => order, update: async ({ data }: { data: object }) => Object.assign(order, data) },
    processStepExecution: {
      findMany: async () => steps.map((row) => ({ ...row })),
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(steps.find((row) => row.id === where.id)!, data),
    },
    inspection: { findMany: async () => inspections },
  } as unknown as Prisma.TransactionClient;
  return { steps, inspections, order, tx };
}

describe("production flow invariants", () => {
  it("PASS clears the inspection block and uses predecessor good output", async () => {
    const { steps, tx, order } = fixture();
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]).toMatchObject({ readiness: "READY", blockedReasonCodes: [] });
    expect(outputQuantityLimit(steps[1]!, steps, 120)).toBe(115);
  });

  it("PASS preserves material and manual blocks", async () => {
    const { steps, tx, order } = fixture();
    steps[1]!.blockedReasonCodes.push("MATERIAL_SHORTAGE", "MANUAL_HOLD");
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]).toMatchObject({ readiness: "BLOCKED", blockedReasonCodes: ["MATERIAL_SHORTAGE", "MANUAL_HOLD"] });
  });

  it.each(["FAIL", "HOLD"] as const)("%s keeps the next process blocked", async (verdict) => {
    const { steps, inspections, tx, order } = fixture();
    inspections[0]!.verdict = verdict;
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]!.readiness).toBe("BLOCKED");
  });

  it("another LOT's inspection and quantity cannot control this LOT", async () => {
    const { steps, inspections, tx, order } = fixture();
    inspections.push({ ...inspections[0]!, productionLotNumber: "LOT-B", verdict: "FAIL" });
    steps.push({ ...steps[0]!, id: "other", sequence: 15, productionLotNumber: "LOT-B", goodQuantity: 1 });
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]!.readiness).toBe("READY");
    expect(outputQuantityLimit(steps[1]!, steps, 120)).toBe(115);
  });

  it.each([0, null])("cannot start with predecessor good output %s", async (quantity) => {
    const { steps, tx, order } = fixture();
    steps[0]!.goodQuantity = quantity;
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]!.readiness).toBe("BLOCKED");
  });

  it("PASS does not bypass an unfinished predecessor", async () => {
    const { steps, tx, order } = fixture();
    steps[0]!.readiness = "IN_PROGRESS";
    await refreshProductionFlow(tx, order.id);
    expect(steps[1]!.readiness).toBe("WAITING");
  });

  it("all processes need a passing final inspection before the order completes", async () => {
    const { steps, inspections, tx, order } = fixture();
    steps[1]!.readiness = "COMPLETED";
    inspections.push({ ...inspections[0]!, gate: "LOT_COMPLETE", executionStatus: "PENDING", verdict: null });
    await refreshProductionFlow(tx, order.id);
    expect(order.status).toBe("IN_PROGRESS");
    inspections[1]!.executionStatus = "COMPLETED";
    inspections[1]!.verdict = "PASS";
    await refreshProductionFlow(tx, order.id);
    expect(order.status).toBe("COMPLETED");
    expect(order.progressPercent).toBe(100);
  });

  it("concurrent write conflicts return a retryable domain error", async () => {
    const transaction = vi.fn().mockRejectedValue({ code: "P2034" });
    await expect(productionTransaction({ $transaction: transaction } as unknown as PrismaService, async () => true))
      .rejects.toMatchObject({ response: { code: "PRODUCTION_STATE_CHANGED" } });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
});
