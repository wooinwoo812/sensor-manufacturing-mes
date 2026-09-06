import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import {
  CsrfGuard,
  PermissionGuard,
  RequirePermissions,
} from "../auth/auth.guards.js";
import type { HttpRequest } from "../auth/auth.http.js";
import { AdminUsersService } from "./admin-users.service.js";

@Controller("admin/users")
@UseGuards(PermissionGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get("roles")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.USER_MANAGE)
  roles() {
    return this.adminUsersService.roles();
  }

  @Get(":id/access-history")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.USER_MANAGE)
  history(@Param("id") id: string, @Query() query: Record<string, unknown>) {
    return this.adminUsersService.history(id, query);
  }

  @Patch(":id/access")
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.USER_MANAGE)
  changeAccess(
    @Param("id") id: string,
    @Body() input: unknown,
    @Req() request: HttpRequest,
  ) {
    if (!request.auth) throw new Error("Authenticated command required");
    return this.adminUsersService.changeAccess(id, input, request.auth);
  }

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.USER_MANAGE)
  async list() {
    return this.adminUsersService.list();
  }
}
