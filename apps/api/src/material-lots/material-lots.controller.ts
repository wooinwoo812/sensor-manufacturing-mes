import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { MaterialLotsService } from "./material-lots.service.js";
import type { MaterialLotListResult } from "./material-lots.contract.js";

@Controller("material-lots")
@UseGuards(PermissionGuard)
export class MaterialLotsController {
  constructor(private readonly materialLotsService: MaterialLotsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.MATERIAL_LOT_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<MaterialLotListResult> {
    return this.materialLotsService.list(this.materialLotsService.parseQuery(query));
  }
}
