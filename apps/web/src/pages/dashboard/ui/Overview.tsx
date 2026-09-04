import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardWeeklyPoint } from "@/entities/dashboard";

interface OverviewProps {
  weekly: DashboardWeeklyPoint[];
}

export function Overview({ weekly }: OverviewProps) {
  const data = weekly.map((point) => ({
    name: point.weekday,
    planned: point.plannedQuantity,
    completed: point.progressQuantity,
  }));

  return (
    <div
      aria-label="월요일부터 일요일까지 납기 계획 대비 진행 수량 막대그래프"
      role="img"
    >
      <ResponsiveContainer height={288} width="100%">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            fontSize={12}
            stroke="var(--muted-foreground)"
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={12}
            stroke="var(--muted-foreground)"
            tickFormatter={(value: number) => `${value}`}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="planned"
            fill="var(--muted-foreground)"
            fillOpacity={0.35}
            name="계획"
            radius={[2, 2, 0, 0]}
          />
          <Bar dataKey="completed" fill="var(--primary)" name="진행" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
