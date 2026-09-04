import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { AdminUsersService } from "./admin-users.service.js";

@Controller("admin/users")
@UseGuards(PermissionGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.USER_MANAGE)
  async list() {
    return this.adminUsersService.list();
  }
}
