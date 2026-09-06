import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service.js";
import { InspectionVerdictService } from "../src/inspections/inspection-verdict.service.js";

// Small committed fixtures allow two independent database transactions to race.
// Cleanup targets only IDs created by this test, even on assertion failure.
describe.skipIf(process.env.MES_POSTGRES_TESTS !== "1")("HOLD review / PostgreSQL atomicity", () => {
  const prisma = new PrismaService();
  afterAll(async () => { await prisma.$disconnect(); });
  async function fixture(run: (id: string, actor: { userId: string; activeRole: "QUALITY_ENGINEER"; displayName: string }) => Promise<void>) {
    const suffix = randomUUID().slice(0, 12);
    const actor = { userId: `review-test-${suffix}`, activeRole: "QUALITY_ENGINEER" as const, displayName: "검토 테스트" };
    const order = await prisma.workOrder.create({ data: {
      orderNumber: `QA-${suffix}`, productCode: "SEN-IR-640", productName: "검토 회귀 전용", plannedQuantity: 1, unit: "EA", dueDate: new Date("2099-01-01"), status: "IN_PROGRESS", priority: "NORMAL",
      processSteps: { create: [
        { sequence: 10, processStepName: "절단", productionLotNumber: `QL-${suffix}`, readiness: "COMPLETED", goodQuantity: 1, defectQuantity: 0 },
        { sequence: 20, processStepName: "조립", productionLotNumber: `QL-${suffix}`, readiness: "BLOCKED", blockedReasonCodes: ["INSPECTION_HELD"] },
      ] },
      inspections: { create: { inspectionNumber: `QI-${suffix}`, productionLotNumber: `QL-${suffix}`, processStepName: "절단", gate: "ROUTE_ADVANCE", specName: "검토 규격", executionStatus: "COMPLETED", verdict: "HOLD", verdictMemo: "원래 보류 사유", completedAt: new Date() } },
    }, include: { inspections: true } });
    try { await run(order.inspections[0]!.id, actor); }
    finally {
      await prisma.$transaction(async tx => {
        await tx.auditEvent.deleteMany({ where: { actorId: actor.userId } });
        await tx.workOrder.delete({ where: { id: order.id } });
      });
    }
  }
  it("commits only one competing review and preserves the imported HOLD", async () => {
    await fixture(async (id, actor) => {
      const service = new InspectionVerdictService(prisma);
      const results = await Promise.allSettled([
        service.review(id, { verdict: "PASS", memo: "교차 측정 합격" }, actor),
        service.review(id, { verdict: "FAIL", memo: "교차 측정 불합격" }, actor),
      ]);
      expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
      expect(["PRODUCTION_STATE_CHANGED", "INSPECTION_NOT_HELD"]).toContain(rejected.reason.response?.code);
      const current = await prisma.inspection.findUniqueOrThrow({ where: { id }, include: { decisions: { orderBy: { sequence: "asc" } } } });
      expect(current.decisions).toHaveLength(2);
      expect(current.decisions[0]).toMatchObject({ phase: "LEGACY", verdict: "HOLD", memo: "원래 보류 사유", actorId: null });
      expect(current.decisions[1]).toMatchObject({ phase: "HOLD_REVIEW", verdict: current.verdict, actorId: actor.userId });
      expect(await prisma.auditEvent.count({ where: { actorId: actor.userId } })).toBe(1);
    });
  });
  it("rolls back decision, current verdict and downstream state if audit storage fails", async () => {
    await fixture(async (id, actor) => {
      const failure = new Error("INJECTED_AUDIT_FAILURE");
      const facade = new Proxy(prisma, { get(target, key) {
        if (key !== "$transaction") return Reflect.get(target, key);
        return (action: (tx: unknown) => Promise<unknown>) => prisma.$transaction(tx => action(new Proxy(tx, { get(client, delegate) {
          return delegate === "auditEvent" ? { create: async () => { throw failure; } } : Reflect.get(client, delegate);
        } })), { isolationLevel: "Serializable" });
      } });
      await expect(new InspectionVerdictService(facade).review(id, { verdict: "PASS", memo: "합격 검토" }, actor)).rejects.toBe(failure);
      const current = await prisma.inspection.findUniqueOrThrow({ where: { id } });
      expect(current).toMatchObject({ verdict: "HOLD", verdictMemo: "원래 보류 사유" });
      expect(await prisma.inspectionDecision.count({ where: { inspectionId: id } })).toBe(0);
      expect(await prisma.processStepExecution.findFirstOrThrow({ where: { workOrderId: current.workOrderId, sequence: 20 } })).toMatchObject({ readiness: "BLOCKED", blockedReasonCodes: ["INSPECTION_HELD"] });
    });
  });
});
