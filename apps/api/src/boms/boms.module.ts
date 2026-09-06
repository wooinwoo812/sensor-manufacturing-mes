import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { BomsController } from "./boms.controller.js";
import { BomsService } from "./boms.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BomsController],
  providers: [BomsService],
})
export class BomsModule {}
