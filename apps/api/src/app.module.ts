import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { OriginGuard } from "./auth/auth.guards.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./health/health.controller.js";
import { MaterialLotsModule } from "./material-lots/material-lots.module.js";
import { MaterialReservationsModule } from "./material-reservations/material-reservations.module.js";
import { AuditEventsModule } from "./audit-events/audit-events.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { InspectionsModule } from "./inspections/inspections.module.js";
import { ProcessExecutionsModule } from "./process-executions/process-executions.module.js";
import { WorkOrdersModule } from "./work-orders/work-orders.module.js";

@Module({
  imports: [
    AuthModule,
    WorkOrdersModule,
    MaterialLotsModule,
    MaterialReservationsModule,
    ProcessExecutionsModule,
    InspectionsModule,
    AuditEventsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OriginGuard,
    },
  ],
})
export class AppModule {}
