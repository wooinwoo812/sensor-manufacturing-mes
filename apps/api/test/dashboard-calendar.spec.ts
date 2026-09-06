import { describe, expect, it, vi } from "vitest";
import { dashboardCalendar } from "../src/dashboard/dashboard-calendar.js";
import { DashboardService } from "../src/dashboard/dashboard.service.js";
import type { PrismaService } from "../src/database/prisma.service.js";

describe("Seoul dashboard calendar", () => {
  it.each([
    ["2026-09-06T23:59:59+09:00", "2026-08-31"],
    ["2026-09-07T00:00:00+09:00", "2026-09-07"],
    ["2026-09-07T08:59:59+09:00", "2026-09-07"],
    ["2026-09-13T23:59:59+09:00", "2026-09-07"],
    ["2027-01-01T01:00:00+09:00", "2026-12-28"],
  ])("%s starts on Monday %s", (instant, monday) => {
    const window = dashboardCalendar(new Date(instant));
    expect(window.weekStart).toEqual(new Date(`${monday}T00:00:00+09:00`));
    expect(window.weekEnd.getTime() - window.weekStart.getTime()).toBe(7 * 86_400_000);
  });

  it("queries Monday through Sunday in Seoul and assigns both boundary days correctly", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-09-07T00:00:00+09:00").getTime());
    const orders = [
      { dueDate: new Date("2026-09-06T23:59:59+09:00"), plannedQuantity: 999, progressPercent: 100 },
      { dueDate: new Date("2026-09-07T00:00:00+09:00"), plannedQuantity: 10, progressPercent: 50 },
      { dueDate: new Date("2026-09-13T23:59:59+09:00"), plannedQuantity: 20, progressPercent: 100 },
      { dueDate: new Date("2026-09-14T00:00:00+09:00"), plannedQuantity: 999, progressPercent: 100 },
    ];
    const findMany = vi.fn(async (query?: { where: { dueDate: { gte: Date; lt: Date } } }) => {
      if (!query) return [];
      const { gte, lt } = query.where.dueDate;
      return orders.filter((order) => order.dueDate >= gte && order.dueDate < lt);
    });
    const transaction = {
      workOrder: { findMany },
      processStepExecution: { findMany: async () => [] },
      inspection: { findMany: async () => [] },
      materialLot: { findMany: async () => [] },
    };
    const prisma = { $transaction: async (action: (tx: typeof transaction) => unknown) => action(transaction) } as unknown as PrismaService;
    try {
      const result = await new DashboardService(prisma).summary();
      expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {
        status: { not: "CANCELLED" },
        dueDate: { gte: new Date("2026-09-06T15:00:00Z"), lt: new Date("2026-09-13T15:00:00Z") },
      } }));
      expect(result.weekly[0]).toEqual({ weekday: "월", plannedQuantity: 10, progressQuantity: 5 });
      expect(result.weekly[6]).toEqual({ weekday: "일", plannedQuantity: 20, progressQuantity: 20 });
      expect(result.weeklyTotals).toEqual({ planned: 30, progress: 25, completionRate: 83.3 });
    } finally {
      clock.mockRestore();
    }
  });
});
