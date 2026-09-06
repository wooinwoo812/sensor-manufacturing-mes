import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/database/prisma.service.js";
import { WorkOrdersService, type CommandActor } from "../src/work-orders/work-orders.service.js";
import { ProcessCommandsService } from "../src/process-executions/process-commands.service.js";
import { ProcessExecutionsService } from "../src/process-executions/process-executions.service.js";
import { MaterialReservationsService } from "../src/material-reservations/material-reservations.service.js";
import { InspectionVerdictService } from "../src/inspections/inspection-verdict.service.js";

// Explicit opt-in against a seeded local database. Every test rolls back all rows.
describe.skipIf(process.env.MES_POSTGRES_TESTS !== "1")("production flow / PostgreSQL rollback integration", () => {
  const prisma = new PrismaService();
  const actor: CommandActor = { userId: "production-flow-test", activeRole: "SYSTEM_ADMIN", displayName: "회귀 테스트" };
  afterAll(async () => { await prisma.$disconnect(); });

  it("cancels a released order with reservations and preserves a 500-character reason", async () => {
    const rollback = new Error("ROLLBACK_CANCELLATION_FIXTURE");
    let orderId = "";
    await expect(prisma.$transaction(async (tx) => {
      const facade = new Proxy(tx, { get(target, key) {
        if (key === "$transaction") return async (action: (client: typeof tx) => unknown) => action(tx);
        return Reflect.get(target, key);
      } }) as unknown as PrismaService;
      const orders = new WorkOrdersService(facade);
      const reservations = new MaterialReservationsService(facade);
      const draft = await orders.create({ productCode: "SEN-IR-640", plannedQuantity: 7, dueDate: "2099-01-01", priority: "NORMAL" }, actor);
      orderId = draft.id;
      await orders.release(orderId, actor);
      const requirement = await tx.workOrderMaterialRequirement.findFirstOrThrow({ where: { workOrderId: orderId } });
      const quantity = Math.ceil(Number(requirement.requiredQuantity));
      const lot = await tx.materialLot.create({ data: {
        lotNumber: `QA-${randomUUID().slice(0, 18)}`, materialId: requirement.materialId,
        receivedQuantity: quantity + 3, onHand: quantity + 3, reservedQuantity: 3, qualityDisposition: "ACCEPTED",
      } });
      await reservations.reserve(orderId, { materialLotId: lot.id, quantity }, actor);
      const reason = "생산계획 변경에 따른 취소 사유입니다.".repeat(30).slice(0, 500);
      expect((await orders.cancel(orderId, reason, actor)).status).toBe("CANCELLED");
      expect(await tx.materialLot.findUniqueOrThrow({ where: { id: lot.id } })).toMatchObject({ reservedQuantity: 3, onHand: quantity + 3 });
      expect(await tx.materialAllocation.findFirstOrThrow({ where: { workOrderId: orderId } })).toMatchObject({ status: "CLOSED", closedReason: "CANCELLED" });
      expect(await tx.inspection.count({ where: { workOrderId: orderId, executionStatus: { not: "CANCELLED" } } })).toBe(0);
      const audit = await tx.auditEvent.findFirstOrThrow({ where: { entityId: draft.orderNumber, action: "WORK_ORDER_CANCELLED" } });
      expect(Array.from(audit.summary)).toHaveLength(200);
      expect(audit.details).toMatchObject({ reason, releasedAllocationCount: 1 });
      throw rollback;
    }, { timeout: 30000, isolationLevel: "Serializable" })).rejects.toBe(rollback);
    expect(await prisma.workOrder.findUnique({ where: { id: orderId } })).toBeNull();
  }, 35000);

  it.each(["SEN-IR-640", "SEN-XR-1280", "SEN-IR-320-QC"])("%s release → reserve → execute → inspect → complete", async (productCode) => {
    const rollback = new Error("ROLLBACK_TEST_FIXTURE");
    let orderId = "";
    await expect(prisma.$transaction(async (tx) => {
      const facade = new Proxy(tx, { get(target, key) {
        if (key === "$transaction") return async (action: (client: typeof tx) => unknown) => action(tx);
        return Reflect.get(target, key);
      } }) as unknown as PrismaService;
      const orders = new WorkOrdersService(facade);
      const processes = new ProcessCommandsService(facade);
      const reads = new ProcessExecutionsService(facade);
      const reservations = new MaterialReservationsService(facade);
      const inspections = new InspectionVerdictService(facade);
      const draft = await orders.create({ productCode, plannedQuantity: 7, dueDate: "2099-01-01", priority: "NORMAL" }, actor);
      orderId = draft.id;
      const released = await orders.release(orderId, actor);
      expect(released.steps.length).toBeGreaterThan(2);
      expect(released.inspections.length).toBeGreaterThan(1);
      expect(released.steps[0]!.readiness).toBe("BLOCKED");
      await expect(inspections.verdict(released.inspections[0]!.id, { verdict: "PASS" }, actor)).rejects.toMatchObject({ response: { code: "INSPECTION_NOT_READY" } });
      await expect(orders.release(orderId, actor)).rejects.toMatchObject({ response: { code: "WORK_ORDER_NOT_DRAFT" } });
      await expect(processes.start(released.steps[0]!.id, actor)).rejects.toMatchObject({ response: { code: "PROCESS_NOT_READY" } });
      const requirements = await tx.workOrderMaterialRequirement.findMany({ where: { workOrderId: orderId } });
      for (const requirement of requirements) {
        const quantity = Math.ceil(Number(requirement.requiredQuantity));
        const lot = await tx.materialLot.create({ data: {
          lotNumber: `QA-${randomUUID().slice(0, 18)}`, materialId: requirement.materialId,
          receivedQuantity: quantity + 1, onHand: quantity + 1, reservedQuantity: 0, qualityDisposition: "ACCEPTED",
        } });
        await expect(reservations.reserve(orderId, { materialLotId: lot.id, quantity: quantity + 1 }, actor))
          .rejects.toMatchObject({ response: { code: "MATERIAL_REQUIREMENT_EXCEEDED" } });
        await reservations.reserve(orderId, { materialLotId: lot.id, quantity }, actor);
      }
      let quantity = 7;
      for (const [index, step] of released.steps.entries()) {
        await processes.start(step.id, actor);
        expect((await reads.detail(step.id)).outputQuantityLimit).toBe(quantity);
        await expect(processes.complete(step.id, { goodQuantity: quantity + 1, defectQuantity: 0 }, actor))
          .rejects.toMatchObject({ response: { code: "PROCESS_QUANTITY_MISMATCH" } });
        await expect(processes.complete(step.id, { goodQuantity: quantity - 1, defectQuantity: 0 }, actor))
          .rejects.toMatchObject({ response: { code: "PROCESS_QUANTITY_MISMATCH" } });
        const defectQuantity = index === 0 ? 1 : 0;
        await processes.complete(step.id, { goodQuantity: quantity - defectQuantity, defectQuantity }, actor);
        quantity -= defectQuantity;
        for (const inspection of released.inspections.filter((row) => row.gate === "ROUTE_ADVANCE" && row.processStepName === step.processStepName)) {
          const next = released.steps[index + 1]!;
          expect((await reads.detail(next.id)).readiness).toBe("BLOCKED");
          await expect(inspections.verdict(inspection.id, { verdict: "HOLD" }, actor)).rejects.toMatchObject({ response: { code: "INVALID_INSPECTION_VERDICT_INPUT" } });
          await inspections.verdict(inspection.id, { verdict: "HOLD", memo: "측정 장비 교차 확인 필요" }, actor);
          expect((await reads.detail(next.id)).blockedReasonCodes).toContain("INSPECTION_HELD");
          const original = await tx.inspectionDecision.findFirstOrThrow({ where: { inspectionId: inspection.id } });
          await inspections.review(inspection.id, { verdict: "PASS", memo: "교차 측정 결과 규격 충족" }, actor);
          await expect(inspections.review(inspection.id, { verdict: "FAIL", memo: "중복 검토 시도" }, actor)).rejects.toMatchObject({ response: { code: "INSPECTION_NOT_HELD" } });
          expect(await tx.inspectionDecision.findUniqueOrThrow({ where: { id: original.id } })).toEqual(original);
          expect(await tx.inspectionDecision.count({ where: { inspectionId: inspection.id } })).toBe(2);
          expect((await reads.detail(next.id)).readiness).toBe("READY");
        }
      }
      expect((await orders.detail(orderId)).status).toBe("IN_PROGRESS");
      for (const inspection of released.inspections.filter((row) => row.gate === "LOT_COMPLETE")) {
        await inspections.verdict(inspection.id, { verdict: "PASS" }, actor);
      }
      expect(await orders.detail(orderId)).toMatchObject({ status: "COMPLETED", progressPercent: 100 });
      expect(await tx.materialAllocation.count({ where: { workOrderId: orderId, closedReason: "FULFILLED" } })).toBe(requirements.length);
      const production = await tx.traceNode.findUniqueOrThrow({ where: { productionLotNumber: released.steps[0]!.productionLotNumber } });
      expect(await tx.lotRelation.count({ where: { childNodeId: production.id, relationType: "CONSUME" } })).toBe(requirements.length);
      throw rollback;
    }, { timeout: 30000, isolationLevel: "Serializable" })).rejects.toBe(rollback);
    expect(await prisma.workOrder.findUnique({ where: { id: orderId } })).toBeNull();
  }, 35000);
});
