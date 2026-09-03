import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuditEventsController } from "./audit-events.controller.js";
import { AuditEventsService } from "./audit-events.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AuditEventsController],
  providers: [PrismaService, AuditEventsService],
})
export class AuditEventsModule {}
