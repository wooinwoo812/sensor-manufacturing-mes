import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { ProcessCommandsService } from "./process-commands.service.js";
import { ProcessExecutionsController } from "./process-executions.controller.js";
import { ProcessExecutionsService } from "./process-executions.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProcessExecutionsController],
  providers: [ProcessExecutionsService, ProcessCommandsService],
})
export class ProcessExecutionsModule {}
