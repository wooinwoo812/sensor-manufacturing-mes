import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { AuthController } from "./auth.controller.js";
import { CsrfGuard, PermissionGuard, SessionGuard } from "./auth.guards.js";
import { AuthService } from "./auth.service.js";

@Module({
  controllers: [AuthController],
  providers: [PrismaService, AuthService, SessionGuard, CsrfGuard, PermissionGuard],
  exports: [AuthService, SessionGuard, CsrfGuard, PermissionGuard],
})
export class AuthModule {}
