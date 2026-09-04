import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { TraceabilityController } from "./traceability.controller.js";
import { TraceabilityService } from "./traceability.service.js";

@Module({
  imports: [AuthModule],
  controllers: [TraceabilityController],
  providers: [PrismaService, TraceabilityService],
})
export class TraceabilityModule {}
