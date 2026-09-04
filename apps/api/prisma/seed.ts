import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { ROLE_CONFIG } from "../src/auth/auth.contract.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/auth/demo-accounts.js";
import { hashPassword } from "../src/auth/password.js";
import { DEMO_WORK_ORDERS } from "./demo-work-orders.js";
import { DEMO_MATERIAL_LOTS, DEMO_MATERIALS } from "./demo-material-lots.js";
import { DEMO_PROCESS_STEPS } from "./demo-process-steps.js";
import { DEMO_INSPECTIONS } from "./demo-inspections.js";
import { DEMO_AUDIT_EVENTS } from "./demo-audit-events.js";
import { DEMO_AUDIT_HISTORY } from "./demo-audit-history.js";
import { DEMO_MATERIAL_ALLOCATIONS } from "./demo-material-allocations.js";
import { DEMO_QUALITY_INCIDENTS } from "./demo-quality-incidents.js";
import { DEMO_TRACE_RELATIONS } from "./demo-trace.js";
import { DEMO_BOM_REVISIONS, DEMO_PRODUCTS } from "./demo-boms.js";
import { DEMO_INSPECTION_SPEC_REVISIONS } from "./demo-inspection-specs.js";

const localDatabaseUrl =
  "postgresql://sensor_mes:sensor_mes_local@localhost:5432/sensor_mes?schema=public";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? localDatabaseUrl,
});
const prisma = new PrismaClient({ adapter });

try {
  const passwordHashes = new Map(
    await Promise.all(
      DEMO_ACCOUNTS.map(async (account) => [
        account.id,
        await hashPassword(DEMO_PASSWORD),
      ] as const),
    ),
  );

  await prisma.$transaction(async (transaction) => {
    for (const [code, configuration] of Object.entries(ROLE_CONFIG)) {
      await transaction.role.upsert({
        where: { code: code as keyof typeof ROLE_CONFIG },
        create: { code: code as keyof typeof ROLE_CONFIG, label: configuration.label },
        update: { label: configuration.label },
      });
    }

    for (const account of DEMO_ACCOUNTS) {
      const passwordHash = passwordHashes.get(account.id);
      if (passwordHash === undefined) {
        throw new Error(`데모 계정 password hash가 없습니다: ${account.id}`);
      }
      const user = await transaction.user.upsert({
        where: { email: account.email },
        create: {
          id: account.id,
          email: account.email,
          displayName: account.displayName,
          passwordHash,
          isActive: true,
          isDemo: true,
        },
        update: {
          displayName: account.displayName,
          passwordHash,
          isActive: true,
          isDemo: true,
        },
      });

      await transaction.userRole.deleteMany({
        where: { userId: user.id, roleCode: { not: account.role } },
      });
      await transaction.userRole.upsert({
        where: {
          userId_roleCode: { userId: user.id, roleCode: account.role },
        },
        create: { userId: user.id, roleCode: account.role },
        update: {},
      });
    }

    for (const order of DEMO_WORK_ORDERS) {
      await transaction.workOrder.upsert({
        where: { orderNumber: order.orderNumber },
        create: order,
        update: order,
      });
    }

    const materialIdByCode = new Map<string, string>();
    for (const material of DEMO_MATERIALS) {
      const row = await transaction.material.upsert({
        where: { code: material.code },
        create: { ...material, isActive: true },
        update: { name: material.name, unit: material.unit, isActive: true },
      });
      materialIdByCode.set(material.code, row.id);
    }

    const materialLotIdByNumber = new Map<string, string>();
    for (const { materialCode, ...lotData } of DEMO_MATERIAL_LOTS) {
      const materialId = materialIdByCode.get(materialCode);
      if (materialId === undefined) {
        throw new Error(`자재 기준정보가 없습니다: ${materialCode}`);
      }
      const row = await transaction.materialLot.upsert({
        where: { lotNumber: lotData.lotNumber },
        create: { ...lotData, materialId },
        update: { ...lotData, materialId },
      });
      materialLotIdByNumber.set(row.lotNumber, row.id);
    }

    // 자재 예약: 목록의 reservedQuantity 와 상세의 예약 내역이 같은 숫자를 보이도록 seed
    const allocationOrderIdByNumber = new Map(
      (
        await transaction.workOrder.findMany({
          select: { id: true, orderNumber: true },
        })
      ).map((row) => [row.orderNumber, row.id] as const),
    );
    await transaction.materialAllocation.deleteMany({});
    for (const allocation of DEMO_MATERIAL_ALLOCATIONS) {
      const workOrderId = allocationOrderIdByNumber.get(allocation.workOrderNumber);
      const materialLotId = materialLotIdByNumber.get(allocation.lotNumber);
      if (workOrderId === undefined || materialLotId === undefined) {
        throw new Error(
          `예약 seed 대상이 없습니다: ${allocation.workOrderNumber} / ${allocation.lotNumber}`,
        );
      }
      await transaction.materialAllocation.create({
        data: { workOrderId, materialLotId, quantity: allocation.quantity, status: "ACTIVE" },
      });
    }
    for (const lot of DEMO_MATERIAL_LOTS) {
      const reserved = DEMO_MATERIAL_ALLOCATIONS.filter(
        (allocation) => allocation.lotNumber === lot.lotNumber,
      ).reduce((sum, allocation) => sum + allocation.quantity, 0);
      if (reserved !== lot.reservedQuantity) {
        throw new Error(
          `${lot.lotNumber} 예약 seed 합계(${reserved})가 reservedQuantity(${lot.reservedQuantity})와 다릅니다.`,
        );
      }
    }

    const productionLotNumbers = [
      ...new Set(DEMO_PROCESS_STEPS.map((step) => step.productionLotNumber)),
    ];
    for (const lotNumber of productionLotNumbers) {
      await transaction.traceNode.upsert({
        where: { productionLotNumber: lotNumber },
        create: {
          nodeType: "PRODUCTION_LOT",
          label: lotNumber,
          productionLotNumber: lotNumber,
        },
        update: {},
      });
    }

    const upsertProductionNode = async (lotNumber: string) =>
      transaction.traceNode.upsert({
        where: { productionLotNumber: lotNumber },
        create: {
          nodeType: "PRODUCTION_LOT",
          label: lotNumber,
          productionLotNumber: lotNumber,
        },
        update: {},
      });

    for (const relation of DEMO_TRACE_RELATIONS) {
      if (relation.kind === "CONSUME") {
        const materialLotId = materialLotIdByNumber.get(relation.materialLotNumber);
        if (materialLotId === undefined) {
          throw new Error(`자재 LOT seed가 없습니다: ${relation.materialLotNumber}`);
        }
        const materialNode = await transaction.traceNode.upsert({
          where: { materialLotId },
          create: {
            nodeType: "MATERIAL_LOT",
            label: relation.materialLotNumber,
            materialLotId,
          },
          update: {},
        });
        const productionNode = await transaction.traceNode.findUnique({
          where: { productionLotNumber: relation.productionLotNumber },
        });
        if (productionNode === null) {
          throw new Error(
            `생산 LOT 추적 노드가 없습니다: ${relation.productionLotNumber}`,
          );
        }
        await transaction.lotRelation.upsert({
          where: {
            relationType_parentNodeId_childNodeId: {
              relationType: "CONSUME",
              parentNodeId: materialNode.id,
              childNodeId: productionNode.id,
            },
          },
          create: {
            relationType: "CONSUME",
            quantity: relation.quantity,
            parentNodeId: materialNode.id,
            childNodeId: productionNode.id,
          },
          update: { quantity: relation.quantity },
        });
        continue;
      }

      if (relation.kind === "SERIALIZE") {
        const productionNode = await transaction.traceNode.findUnique({
          where: { productionLotNumber: relation.productionLotNumber },
        });
        if (productionNode === null) {
          throw new Error(
            `생산 LOT 추적 노드가 없습니다: ${relation.productionLotNumber}`,
          );
        }
        const existingFinishedNode = await transaction.traceNode.findFirst({
          where: { nodeType: "FINISHED_UNIT", label: relation.serialNumber },
        });
        const finishedNode =
          existingFinishedNode ??
          (await transaction.traceNode.create({
            data: {
              nodeType: "FINISHED_UNIT",
              label: relation.serialNumber,
            },
          }));
        await transaction.lotRelation.upsert({
          where: {
            relationType_parentNodeId_childNodeId: {
              relationType: "SERIALIZE",
              parentNodeId: productionNode.id,
              childNodeId: finishedNode.id,
            },
          },
          create: {
            relationType: "SERIALIZE",
            quantity: 1,
            parentNodeId: productionNode.id,
            childNodeId: finishedNode.id,
          },
          update: { quantity: 1 },
        });
        continue;
      }

      const parentNode = await upsertProductionNode(
        relation.parentProductionLotNumber,
      );
      const childNode = await upsertProductionNode(
        relation.childProductionLotNumber,
      );
      await transaction.lotRelation.upsert({
        where: {
          relationType_parentNodeId_childNodeId: {
            relationType: relation.kind,
            parentNodeId: parentNode.id,
            childNodeId: childNode.id,
          },
        },
        create: {
          relationType: relation.kind,
          quantity: relation.quantity,
          parentNodeId: parentNode.id,
          childNodeId: childNode.id,
        },
        update: { quantity: relation.quantity },
      });
    }

    const productIdByCode = new Map<string, string>();
    for (const product of DEMO_PRODUCTS) {
      const row = await transaction.product.upsert({
        where: { code: product.code },
        create: { ...product, isActive: true },
        update: { name: product.name, baseUom: product.baseUom, isActive: true },
      });
      productIdByCode.set(row.code, row.id);
    }

    for (const revision of DEMO_BOM_REVISIONS) {
      const {
        items: bomItems,
        productCode: bomProductCode,
        productName: bomProductName,
        productBaseUom: bomProductBaseUom,
        ...revisionData
      } = revision;
      void bomProductName;
      void bomProductBaseUom;
      const productId = productIdByCode.get(bomProductCode);
      if (productId === undefined) {
        throw new Error(`제품 seed가 없습니다: ${bomProductCode}`);
      }
      const row = await transaction.bomRevision.upsert({
        where: { revisionNumber: revisionData.revisionNumber },
        create: { ...revisionData, productId },
        update: { ...revisionData, productId },
      });
      for (const item of bomItems) {
        const materialId = materialIdByCode.get(item.materialCode);
        if (materialId === undefined) {
          throw new Error(`자재 기준정보가 없습니다: ${item.materialCode}`);
        }
        await transaction.bomItem.upsert({
          where: {
            bomRevisionId_materialId: {
              bomRevisionId: row.id,
              materialId,
            },
          },
          create: {
            bomRevisionId: row.id,
            materialId,
            quantityPerProductBaseUom: item.quantityPerProductBaseUom,
          },
          update: {
            quantityPerProductBaseUom: item.quantityPerProductBaseUom,
          },
        });
      }
    }

    const bomRevisionRow = await transaction.bomRevision.findUnique({
      where: { revisionNumber: "BOM-2026-R004" },
      select: { id: true, productId: true, product: { select: { code: true } } },
    });
    const orderProductRow = await transaction.workOrder.findUnique({
      where: { orderNumber: "WO-2026-093" },
      select: { productCode: true },
    });
    if (
      bomRevisionRow !== null &&
      orderProductRow !== null &&
      bomRevisionRow.product.code === orderProductRow.productCode
    ) {
      await transaction.workOrder.updateMany({
        where: { orderNumber: "WO-2026-093", bomRevisionId: null },
        data: { bomRevisionId: bomRevisionRow.id },
      });
    }

    for (const spec of DEMO_INSPECTION_SPEC_REVISIONS) {
      await transaction.inspectionSpecRevision.upsert({
        where: { revisionNumber: spec.revisionNumber },
        create: {
          revisionNumber: spec.revisionNumber,
          productCode: spec.productCode,
          specName: spec.specName,
          gate: spec.gate,
          ...(spec.processStepName === undefined ? {} : { processStepName: spec.processStepName }),
          ...(spec.description === undefined ? {} : { description: spec.description }),
          lifecycle: spec.lifecycle,
        },
        update: {
          productCode: spec.productCode,
          specName: spec.specName,
          gate: spec.gate,
          processStepName: spec.processStepName ?? null,
          description: spec.description ?? null,
          lifecycle: spec.lifecycle,
        },
      });
    }

    const workOrderIdByNumber = new Map<string, string>();
    for (const order of DEMO_WORK_ORDERS) {
      const row = await transaction.workOrder.findUnique({
        where: { orderNumber: order.orderNumber },
        select: { id: true },
      });
      if (row !== null) {
        workOrderIdByNumber.set(order.orderNumber, row.id);
      }
    }

    for (const { workOrderNumber, ...stepData } of DEMO_PROCESS_STEPS) {
      const workOrderId = workOrderIdByNumber.get(workOrderNumber);
      if (workOrderId === undefined) {
        throw new Error(`작업지시 seed가 없습니다: ${workOrderNumber}`);
      }
      await transaction.processStepExecution.upsert({
        where: {
          workOrderId_sequence_productionLotNumber: {
            workOrderId,
            sequence: stepData.sequence,
            productionLotNumber: stepData.productionLotNumber,
          },
        },
        create: { ...stepData, workOrderId },
        update: { ...stepData, workOrderId },
      });
    }

    for (const { workOrderNumber, ...inspectionData } of DEMO_INSPECTIONS) {
      const workOrderId = workOrderIdByNumber.get(workOrderNumber);
      if (workOrderId === undefined) {
        throw new Error(`작업지시 seed가 없습니다: ${workOrderNumber}`);
      }
      await transaction.inspection.upsert({
        where: { inspectionNumber: inspectionData.inspectionNumber },
        create: { ...inspectionData, workOrderId },
        update: { ...inspectionData, workOrderId },
      });
    }

    for (const incident of DEMO_QUALITY_INCIDENTS) {
      await transaction.qualityIncident.upsert({
        where: { incidentNumber: incident.incidentNumber },
        create: incident,
        update: incident,
      });
    }

    await transaction.auditEvent.deleteMany({});
    await transaction.auditEvent.createMany({
      data: [...DEMO_AUDIT_EVENTS, ...DEMO_AUDIT_HISTORY].map((event) => ({ ...event })),
    });
  });

  console.log(
    `가상 데모 계정 ${DEMO_ACCOUNTS.length}개, 작업지시 ${DEMO_WORK_ORDERS.length}건, 자재 LOT ${DEMO_MATERIAL_LOTS.length}건, 공정 ${DEMO_PROCESS_STEPS.length}건, 검사 ${DEMO_INSPECTIONS.length}건, 부적합 ${DEMO_QUALITY_INCIDENTS.length}건, 감사 ${DEMO_AUDIT_EVENTS.length + DEMO_AUDIT_HISTORY.length}건, 자재 예약 ${DEMO_MATERIAL_ALLOCATIONS.length}건, 계보 ${DEMO_TRACE_RELATIONS.length}건, 검사규격 ${DEMO_INSPECTION_SPEC_REVISIONS.length}건 seed 완료`,
  );
} finally {
  await prisma.$disconnect();
}
