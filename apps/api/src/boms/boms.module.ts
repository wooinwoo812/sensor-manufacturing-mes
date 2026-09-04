import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { BomsController } from "./boms.controller.js";
import { BomsService } from "./boms.service.js";

@Module({
  imports: [AuthModule],
  controllers: [BomsController],
  providers: [PrismaService, BomsService],
})
export class BomsModule {}
