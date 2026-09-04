import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { AuditEventsService } from "./audit-events.service.js";
import type { AuditEventListResult } from "./audit-events.contract.js";

@Controller("audit-events")
@UseGuards(PermissionGuard)
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.AUDIT_EVENT_READ)
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
  ): Promise<AuditEventListResult> {
    return this.auditEventsService.list(this.auditEventsService.parseQuery(query));
  }
}
