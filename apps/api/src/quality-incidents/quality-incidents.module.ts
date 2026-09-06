import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { QualityIncidentsController } from "./quality-incidents.controller.js";
import { QualityIncidentsService } from "./quality-incidents.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [QualityIncidentsController],
  providers: [QualityIncidentsService],
})
export class QualityIncidentsModule {}
