import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "월", total: 18 },
  { name: "화", total: 24 },
  { name: "수", total: 21 },
  { name: "목", total: 28 },
  { name: "금", total: 26 },
  { name: "토", total: 14 },
  { name: "일", total: 9 },
] as const;

export function Overview() {
  return (
    <ResponsiveContainer height={350} width="100%">
      <BarChart data={data}>
        <XAxis
          axisLine={false}
          dataKey="name"
          fontSize={12}
          stroke="#888888"
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          fontSize={12}
          stroke="#888888"
          tickFormatter={(value: number) => `${value}건`}
          tickLine={false}
        />
        <Bar
          className="fill-primary"
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
