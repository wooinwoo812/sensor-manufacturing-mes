import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../database/prisma.service.js";
import { AdminUsersController } from "./admin-users.controller.js";
import { AdminUsersService } from "./admin-users.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
  providers: [PrismaService, AdminUsersService],
})
export class AdminUsersModule {}
