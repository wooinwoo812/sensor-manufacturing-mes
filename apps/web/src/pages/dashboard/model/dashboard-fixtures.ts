export const weeklyProduction = [
  { name: "월", planned: 24, completed: 18 },
  { name: "화", planned: 28, completed: 24 },
  { name: "수", planned: 26, completed: 21 },
  { name: "목", planned: 30, completed: 28 },
  { name: "금", planned: 32, completed: 26 },
  { name: "토", planned: 18, completed: 14 },
  { name: "일", planned: 12, completed: 9 },
] as const;

const totals = weeklyProduction.reduce(
  (result, current) => ({
    completed: result.completed + current.completed,
    planned: result.planned + current.planned,
  }),
  { completed: 0, planned: 0 },
);

export const weeklyProductionSummary = {
  ...totals,
  completionRate: Number(
    ((totals.completed / totals.planned) * 100).toFixed(1),
  ),
} as const;
