import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WorkOrdersController } from "./work-orders.controller.js";
import { WorkOrdersService } from "./work-orders.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
