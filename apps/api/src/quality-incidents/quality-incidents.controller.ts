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
import { QualityIncidentsService } from "./quality-incidents.service.js";
import type {
  QualityIncidentListItem,
  QualityIncidentDetail,
  QualityIncidentListResult,
} from "./quality-incidents.contract.js";

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

@Controller("quality-incidents")
@UseGuards(PermissionGuard)
export class QualityIncidentsController {
  constructor(private readonly qualityIncidentsService: QualityIncidentsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.QUALITY_INCIDENT_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<QualityIncidentListResult> {
    return this.qualityIncidentsService.list(
      this.qualityIncidentsService.parseQuery(query),
    );
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.QUALITY_INCIDENT_READ)
  async detail(@Param("id") id: string): Promise<QualityIncidentDetail> {
    return this.qualityIncidentsService.detail(id);
  }

  @Post()
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.QUALITY_INCIDENT_CREATE)
  async register(
    @Req() request: HttpRequest,
    @Body() input: unknown,
  ): Promise<QualityIncidentListItem> {
    return this.qualityIncidentsService.register(
      (input ?? {}) as Record<string, unknown>,
      toActor(request),
    );
  }
}
