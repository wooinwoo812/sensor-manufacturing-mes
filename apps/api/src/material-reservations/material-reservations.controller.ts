import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { CsrfGuard, PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import type { HttpRequest } from "../auth/auth.http.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import {
  MaterialReservationsService,
  type MaterialReservationView,
} from "./material-reservations.service.js";

function toActor(request: HttpRequest): CommandActor {
  const auth = request.auth;
  if (auth === undefined) {
    throw new Error("인증된 요청에서만 command를 실행할 수 있습니다.");
  }
  return {
    userId: auth.userId,
    displayName: auth.displayName,
    activeRole: auth.activeRole,
  };
}

@Controller("work-orders")
@UseGuards(PermissionGuard)
export class MaterialReservationsController {
  constructor(
    private readonly materialReservationsService: MaterialReservationsService,
  ) {}

  @Get(":id/material-reservations")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.MATERIAL_ALLOCATION_READ)
  async list(@Param("id") id: string): Promise<MaterialReservationView[]> {
    return this.materialReservationsService.list(id);
  }

  @Post(":id/material-reservations")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.MATERIAL_ALLOCATION_CREATE)
  async reserve(
    @Req() request: HttpRequest,
    @Param("id") id: string,
    @Body() input: unknown,
  ) {
    return this.materialReservationsService.reserve(
      id,
      (input ?? {}) as Record<string, unknown>,
      toActor(request),
    );
  }
}

@Controller("material-allocations")
@UseGuards(PermissionGuard)
export class MaterialAllocationsController {
  constructor(
    private readonly materialReservationsService: MaterialReservationsService,
  ) {}

  @Post(":id/release")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.MATERIAL_ALLOCATION_RELEASE)
  async release(@Req() request: HttpRequest, @Param("id") id: string) {
    return this.materialReservationsService.release(id, toActor(request));
  }
}
