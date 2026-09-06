import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { InspectionVerdictService } from "./inspection-verdict.service.js";
import { InspectionsController } from "./inspections.controller.js";
import { InspectionsService } from "./inspections.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [InspectionsController],
  providers: [InspectionsService, InspectionVerdictService],
})
export class InspectionsModule {}
