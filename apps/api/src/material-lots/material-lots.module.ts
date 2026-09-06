import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { MaterialLotDispositionService } from "./material-lot-disposition.service.js";
import { MaterialLotsController } from "./material-lots.controller.js";
import { MaterialLotsService } from "./material-lots.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MaterialLotsController],
  providers: [MaterialLotsService, MaterialLotDispositionService],
})
export class MaterialLotsModule {}
