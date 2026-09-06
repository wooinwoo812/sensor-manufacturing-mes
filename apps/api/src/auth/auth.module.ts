import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { CsrfGuard, PermissionGuard, SessionGuard } from "./auth.guards.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, CsrfGuard, PermissionGuard],
  exports: [AuthService, SessionGuard, CsrfGuard, PermissionGuard],
})
export class AuthModule {}
