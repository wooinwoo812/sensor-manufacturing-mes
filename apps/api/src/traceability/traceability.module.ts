import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { TraceabilityController } from "./traceability.controller.js";
import { TraceabilityService } from "./traceability.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
})
export class TraceabilityModule {}
