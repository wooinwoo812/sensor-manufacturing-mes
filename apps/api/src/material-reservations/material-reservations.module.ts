import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import {
  MaterialAllocationsController,
  MaterialReservationsController,
} from "./material-reservations.controller.js";
import { MaterialReservationsService } from "./material-reservations.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MaterialReservationsController, MaterialAllocationsController],
  providers: [MaterialReservationsService],
})
export class MaterialReservationsModule {}
