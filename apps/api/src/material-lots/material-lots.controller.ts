import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
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
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { MaterialLotDispositionService } from "./material-lot-disposition.service.js";
import { MaterialLotsService } from "./material-lots.service.js";
import type {
  MaterialLotDetail,
  MaterialLotListResult,
} from "./material-lots.contract.js";

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

@Controller("material-lots")
@UseGuards(PermissionGuard)
export class MaterialLotsController {
  constructor(
    private readonly materialLotsService: MaterialLotsService,
    private readonly materialLotDispositionService: MaterialLotDispositionService,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.MATERIAL_LOT_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<MaterialLotListResult> {
    return this.materialLotsService.list(this.materialLotsService.parseQuery(query));
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.MATERIAL_LOT_READ)
  async detail(@Param("id") id: string): Promise<MaterialLotDetail> {
    return this.materialLotsService.detail(id);
  }

  @Post(":id/disposition")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.MATERIAL_LOT_DECIDE_QUALITY)
  async decideDisposition(
    @Req() request: HttpRequest,
    @Param("id") id: string,
    @Body() input: unknown,
  ) {
    return this.materialLotDispositionService.decide(
      id,
      (input ?? {}) as Record<string, unknown>,
      toActor(request),
    );
  }
}
