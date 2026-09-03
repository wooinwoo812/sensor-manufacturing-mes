import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { ProcessCommandsService } from "./process-commands.service.js";
import { ProcessExecutionsController } from "./process-executions.controller.js";
import { ProcessExecutionsService } from "./process-executions.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ProcessExecutionsController],
  providers: [PrismaService, ProcessExecutionsService, ProcessCommandsService],
})
export class ProcessExecutionsModule {}
