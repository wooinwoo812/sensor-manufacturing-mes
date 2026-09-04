import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { InspectionVerdictService } from "./inspection-verdict.service.js";
import { InspectionsController } from "./inspections.controller.js";
import { InspectionsService } from "./inspections.service.js";

@Module({
  imports: [AuthModule],
  controllers: [InspectionsController],
  providers: [PrismaService, InspectionsService, InspectionVerdictService],
})
export class InspectionsModule {}
