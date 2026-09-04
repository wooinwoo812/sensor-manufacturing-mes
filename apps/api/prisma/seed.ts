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

    for (const { materialCode, ...lotData } of DEMO_MATERIAL_LOTS) {
      const materialId = materialIdByCode.get(materialCode);
      if (materialId === undefined) {
        throw new Error(`자재 기준정보가 없습니다: ${materialCode}`);
      }
      await transaction.materialLot.upsert({
        where: { lotNumber: lotData.lotNumber },
        create: { ...lotData, materialId },
        update: { ...lotData, materialId },
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

    await transaction.auditEvent.deleteMany({});
    await transaction.auditEvent.createMany({
      data: DEMO_AUDIT_EVENTS.map((event) => ({ ...event })),
    });
  });

  console.log(
    `가상 데모 계정 ${DEMO_ACCOUNTS.length}개, 작업지시 ${DEMO_WORK_ORDERS.length}건, 자재 LOT ${DEMO_MATERIAL_LOTS.length}건, 공정 ${DEMO_PROCESS_STEPS.length}건, 검사 ${DEMO_INSPECTIONS.length}건, 감사 ${DEMO_AUDIT_EVENTS.length}건 seed 완료`,
  );
} finally {
  await prisma.$disconnect();
}
