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
import { ProcessCommandsService } from "./process-commands.service.js";
import { ProcessExecutionsService } from "./process-executions.service.js";
import type { ProcessExecutionListResult } from "./process-executions.contract.js";

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

@Controller("process-executions")
@UseGuards(PermissionGuard)
export class ProcessExecutionsController {
  constructor(
    private readonly processExecutionsService: ProcessExecutionsService,
    private readonly processCommandsService: ProcessCommandsService,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.PROCESS_EXECUTION_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<ProcessExecutionListResult> {
    return this.processExecutionsService.list(
      this.processExecutionsService.parseQuery(query),
    );
  }

  @Post("steps/:stepId/start")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.PROCESS_EXECUTION_EXECUTE)
  async start(@Req() request: HttpRequest, @Param("stepId") stepId: string) {
    return this.processCommandsService.start(stepId, toActor(request));
  }

  @Post("steps/:stepId/complete")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(CsrfGuard)
  @RequirePermissions(Permission.PROCESS_EXECUTION_EXECUTE)
  async complete(
    @Req() request: HttpRequest,
    @Param("stepId") stepId: string,
    @Body() input: unknown,
  ) {
    return this.processCommandsService.complete(
      stepId,
      (input ?? {}) as Record<string, unknown>,
      toActor(request),
    );
  }
}
