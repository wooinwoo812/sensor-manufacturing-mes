import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [PrismaService, DashboardService],
})
export class DashboardModule {}
