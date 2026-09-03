export interface DashboardMetricSummary {
  workOrders: {
    inProgress: number;
    released: number;
    draft: number;
    completed: number;
    cancelled: number;
    overdue: number;
    blocked: number;
  };
  productionLots: {
    distinct: number;
    inProgress: number;
  };
  inspections: {
    pending: number;
    inProgress: number;
    failed: number;
    hold: number;
  };
  materialLots: {
    quarantined: number;
    shortage: number;
    expired: number;
  };
}

export interface DashboardWeeklyPoint {
  weekday: string;
  plannedQuantity: number;
  progressQuantity: number;
}

export interface DashboardAttentionItem {
  code: string;
  context: string;
  reason: string;
  status: string;
  tone: "danger" | "warning";
}

export interface DashboardSummary {
  metrics: DashboardMetricSummary;
  weekly: DashboardWeeklyPoint[];
  weeklyTotals: { planned: number; progress: number; completionRate: number };
  attentionQueue: DashboardAttentionItem[];
}
