import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { MaterialLotsController } from "./material-lots.controller.js";
import { MaterialLotsService } from "./material-lots.service.js";

@Module({
  imports: [AuthModule],
  controllers: [MaterialLotsController],
  providers: [PrismaService, MaterialLotsService],
})
export class MaterialLotsModule {}
