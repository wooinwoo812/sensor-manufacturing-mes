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
      <ResponsiveContainer height={240} width="100%">
        <BarChart
          accessibilityLayer
          data={data}
          barGap={4}
          maxBarSize={24}
          margin={{ left: 0, right: 4, top: 8 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="name"
            fontSize={14}
            stroke="var(--muted-foreground)"
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            fontSize={14}
            stroke="var(--muted-foreground)"
            tickFormatter={(value: number) => `${value}`}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--popover-foreground)",
              fontSize: 14,
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="planned"
            fill="var(--muted-foreground)"
            fillOpacity={0.35}
            name="계획"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            isAnimationActive={false}
            dataKey="completed"
            fill="var(--primary)"
            name="진행"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>요일별 납기 계획과 진행 수량</caption>
        <thead>
          <tr>
            <th scope="col">요일</th>
            <th scope="col">계획</th>
            <th scope="col">진행</th>
          </tr>
        </thead>
        <tbody>
          {weekly.map((point) => (
            <tr key={point.weekday}>
              <th scope="row">{point.weekday}</th>
              <td>{point.plannedQuantity}</td>
              <td>{point.progressQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
