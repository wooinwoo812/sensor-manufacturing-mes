import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AuditEventsController } from "./audit-events.controller.js";
import { AuditEventsService } from "./audit-events.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AuditEventsController],
  providers: [AuditEventsService],
})
export class AuditEventsModule {}
