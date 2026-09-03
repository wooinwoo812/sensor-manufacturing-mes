import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  MaterialAllocationsController,
  MaterialReservationsController,
} from "./material-reservations.controller.js";
import { MaterialReservationsService } from "./material-reservations.service.js";

@Module({
  imports: [AuthModule],
  controllers: [MaterialReservationsController, MaterialAllocationsController],
  providers: [PrismaService, MaterialReservationsService],
})
export class MaterialReservationsModule {}
