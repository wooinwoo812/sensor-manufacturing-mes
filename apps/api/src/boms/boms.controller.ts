import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { parseBomQuery, BomsService } from "./boms.service.js";
import type { BomRevisionListResult } from "./boms.contract.js";

@Controller("materials/boms")
@UseGuards(PermissionGuard)
export class BomsController {
  constructor(private readonly bomsService: BomsService) {}

  @Get()
  @RequirePermissions(Permission.MASTER_DATA_READ)
  async search(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<BomRevisionListResult> {
    return this.bomsService.search(parseBomQuery(query));
  }
}
