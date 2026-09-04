import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { QualityIncidentsController } from "./quality-incidents.controller.js";
import { QualityIncidentsService } from "./quality-incidents.service.js";

@Module({
  imports: [AuthModule],
  controllers: [QualityIncidentsController],
  providers: [PrismaService, QualityIncidentsService],
})
export class QualityIncidentsModule {}
