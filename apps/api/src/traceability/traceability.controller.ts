import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { parseTraceNodeQuery, TraceabilityService } from "./traceability.service.js";
import type { TraceNodeDetail, TraceNodeListResult } from "./traceability.contract.js";

@Controller("traceability")
@UseGuards(PermissionGuard)
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get("nodes")
  @RequirePermissions(Permission.TRACE_READ)
  async search(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<TraceNodeListResult> {
    return this.traceabilityService.search(parseTraceNodeQuery(query));
  }

  @Get("nodes/:id")
  @RequirePermissions(Permission.TRACE_READ)
  async detail(@Param("id") id: string): Promise<TraceNodeDetail> {
    return this.traceabilityService.detail(id);
  }
}
