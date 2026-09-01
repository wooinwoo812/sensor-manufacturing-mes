import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { weeklyProduction } from "../model/dashboard-fixtures";

export function Overview() {
  return (
    <div
      aria-label="월요일부터 일요일까지 계획 대비 완료 생산 수량 막대그래프"
      role="img"
    >
      <ResponsiveContainer height={288} width="100%">
        <BarChart
          data={weeklyProduction}
          margin={{ left: 4, right: 8, top: 8 }}
        >
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
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            formatter={(value, name) => [
              `${String(value)} EA`,
              name === "planned" ? "계획" : "완료",
            ]}
          />
          <Bar
            dataKey="planned"
            fill="var(--muted-foreground)"
            fillOpacity={0.3}
            maxBarSize={20}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="completed"
            fill="var(--primary)"
            maxBarSize={20}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
