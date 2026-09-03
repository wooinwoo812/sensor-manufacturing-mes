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
import { CsrfGuard, PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import type { HttpRequest } from "../auth/auth.http.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { InspectionVerdictService } from "./inspection-verdict.service.js";
import { InspectionsService } from "./inspections.service.js";
import type { InspectionListResult } from "./inspections.contract.js";

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

@Controller("inspections")
@UseGuards(PermissionGuard)
export class InspectionsController {
  constructor(
    private readonly inspectionsService: InspectionsService,
    private readonly inspectionVerdictService: InspectionVerdictService,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.INSPECTION_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<InspectionListResult> {
    return this.inspectionsService.list(this.inspectionsService.parseQuery(query));
  }

  @Post(":id/verdict")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.INSPECTION_EXECUTE)
  async verdict(
    @Req() request: HttpRequest,
    @Param("id") id: string,
    @Body() input: unknown,
  ) {
    return this.inspectionVerdictService.verdict(
      id,
      (input ?? {}) as Record<string, unknown>,
      toActor(request),
    );
  }
}
