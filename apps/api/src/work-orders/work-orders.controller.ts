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
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { CsrfGuard } from "../auth/auth.guards.js";
import type { HttpRequest } from "../auth/auth.http.js";
import { WorkOrdersService, type CommandActor } from "./work-orders.service.js";
import type { WorkOrderListResult } from "./work-orders.contract.js";

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
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.WORK_ORDER_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<WorkOrderListResult> {
    return this.workOrdersService.list(this.workOrdersService.parseQuery(query));
  }

  @Get("products")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.WORK_ORDER_READ)
  async products() {
    return { items: this.workOrdersService.products() };
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.WORK_ORDER_READ)
  async detail(@Param("id") id: string) {
    return this.workOrdersService.detail(id);
  }

  @Post()
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.WORK_ORDER_CREATE)
  async create(
    @Req() request: HttpRequest,
    @Body() input: unknown,
  ) {
    return this.workOrdersService.create(
      input as Record<string, unknown>,
      toActor(request),
    );
  }

  @Post(":id/release")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.WORK_ORDER_RELEASE)
  async release(@Req() request: HttpRequest, @Param("id") id: string) {
    return this.workOrdersService.release(id, toActor(request));
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.WORK_ORDER_CANCEL)
  async cancel(
    @Req() request: HttpRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const reason =
      typeof body === "object" && body !== null && "reason" in body
        ? (body as { reason?: unknown }).reason
        : undefined;
    return this.workOrdersService.cancel(id, reason, toActor(request));
  }
}
