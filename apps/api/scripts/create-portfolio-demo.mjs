import "reflect-metadata";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaService } from "../dist/database/prisma.service.js";
import { WorkOrdersService } from "../dist/work-orders/work-orders.service.js";
import { ProcessCommandsService } from "../dist/process-executions/process-commands.service.js";
import { MaterialReservationsService } from "../dist/material-reservations/material-reservations.service.js";
import { InspectionVerdictService } from "../dist/inspections/inspection-verdict.service.js";

// Master data is seeded separately. Every production transition uses the same commands as HTTP.
// Each scenario is atomic; repeated runs reuse it and never reset user changes.
const prisma = new PrismaService();
const planner = { userId: "portfolio-planner", activeRole: "PRODUCTION_PLANNER", displayName: "생산계획 데모" };
const materialActor = { userId: "portfolio-material", activeRole: "MATERIAL_MANAGER", displayName: "자재 데모" };
const operator = { userId: "portfolio-operator", activeRole: "SHOP_FLOOR_OPERATOR", displayName: "현장 데모" };
const quality = { userId: "portfolio-quality", activeRole: "QUALITY_ENGINEER", displayName: "품질 데모" };
const scenarios = [
  { key: "NORMAL", label: "정상 완료" },
  { key: "HOLD", label: "검사 보류" },
  { key: "FAIL", label: "불합격 차단" },
  { key: "REVIEWED", label: "보류 검토 후 완료" },
];
const manifest = [];
try {
  for (const scenario of scenarios) {
    const marker = `[PORTFOLIO-V1:${scenario.key}] ${scenario.label}`;
    let order = await prisma.workOrder.findFirst({ where: { memo: marker } });
    if (!order) {
      order = await prisma.$transaction(async tx => {
        const facade = new Proxy(tx, { get(target, key) {
          return key === "$transaction" ? action => action(tx) : Reflect.get(target, key);
        } });
        const orders = new WorkOrdersService(facade);
        const processes = new ProcessCommandsService(facade);
        const reservations = new MaterialReservationsService(facade);
        const inspections = new InspectionVerdictService(facade);
        const dueDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() + 3 * 86400000));
        const draft = await orders.create({ productCode: "SEN-IR-640", plannedQuantity: 12, dueDate, priority: "NORMAL", memo: marker }, planner);
        const released = await orders.release(draft.id, planner);
        for (const [index, requirement] of (await tx.workOrderMaterialRequirement.findMany({ where: { workOrderId: draft.id } })).entries()) {
          const quantity = Math.ceil(Number(requirement.requiredQuantity));
          // Incoming inventory is a disclosed fixture, not a simulated production transition.
          const lot = await tx.materialLot.create({ data: { lotNumber: `PF-${scenario.key}-${draft.orderNumber.slice(3)}-${index + 1}`, materialId: requirement.materialId, receivedQuantity: quantity, onHand: quantity, reservedQuantity: 0, qualityDisposition: "ACCEPTED" } });
          await reservations.reserve(draft.id, { materialLotId: lot.id, quantity }, materialActor);
        }
        let quantity = 12;
        let gateSeen = false;
        for (const [index, step] of released.steps.entries()) {
          await processes.start(step.id, operator);
          const defectQuantity = index === 0 ? 1 : 0;
          await processes.complete(step.id, { goodQuantity: quantity - defectQuantity, defectQuantity, memo: "대표 생산 사례 실적" }, operator);
          quantity -= defectQuantity;
          for (const inspection of released.inspections.filter(row => row.gate === "ROUTE_ADVANCE" && row.processStepName === step.processStepName)) {
            const firstGate = !gateSeen;
            gateSeen = true;
            const verdict = firstGate && scenario.key !== "NORMAL" ? (scenario.key === "FAIL" ? "FAIL" : "HOLD") : "PASS";
            await inspections.verdict(inspection.id, { verdict, memo: verdict === "FAIL" ? "치수 편차 기준 초과. 후속 조립 차단" : verdict === "HOLD" ? "측정 장비 간 편차 확인 필요. 교차 측정 대기" : "측정 결과 규격 충족" }, quality);
            if (firstGate && scenario.key === "REVIEWED") {
              await inspections.review(inspection.id, { verdict: "PASS", memo: "교정된 장비로 교차 측정 완료. 규격 충족 확인" }, quality);
            } else if (verdict !== "PASS") {
              return tx.workOrder.findUniqueOrThrow({ where: { id: draft.id } });
            }
          }
        }
        for (const inspection of released.inspections.filter(row => row.gate === "LOT_COMPLETE")) {
          await inspections.verdict(inspection.id, { verdict: "PASS", memo: "전체 공정 및 필수 검사 확인 완료" }, quality);
        }
        return tx.workOrder.findUniqueOrThrow({ where: { id: draft.id } });
      }, { isolationLevel: "Serializable", timeout: 60000 });
    }
    const detail = await new WorkOrdersService(prisma).detail(order.id);
    manifest.push({ ...scenario, workOrderId: order.id, orderNumber: order.orderNumber, detail });
    console.log(`${scenario.label}: ${order.orderNumber} / ${order.status}`);
  }
  const output = new URL("../../../docs/assets/demo-cases.json", import.meta.url);
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, JSON.stringify({ generatedAt: new Date().toISOString(), cases: manifest }, null, 2) + "\n");
} finally { await prisma.$disconnect(); }
