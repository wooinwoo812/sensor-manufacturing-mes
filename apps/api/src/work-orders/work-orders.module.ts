import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { WorkOrdersController } from "./work-orders.controller.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Module({
  imports: [AuthModule],
  controllers: [WorkOrdersController],
  providers: [PrismaService, WorkOrdersService],
})
export class WorkOrdersModule {}
