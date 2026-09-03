import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { Permission } from "../auth/auth.contract.js";
import { PermissionGuard, RequirePermissions } from "../auth/auth.guards.js";
import { DashboardService } from "./dashboard.service.js";
import type { DashboardSummary } from "./dashboard.contract.js";

@Controller("dashboard")
@UseGuards(PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(Permission.DASHBOARD_READ)
  async summary(): Promise<DashboardSummary> {
    return this.dashboardService.summary();
  }
}
