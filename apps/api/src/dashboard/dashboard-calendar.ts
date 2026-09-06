const DAY_MS = 86_400_000;

/** A single Seoul calendar snapshot for the whole summary request. */
export function dashboardCalendar(now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const todayStart = new Date(`${date}T00:00:00+09:00`);
  // Read the weekday of the Seoul calendar date, not the preceding UTC date.
  const daysSinceMonday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekStart = new Date(todayStart.getTime() - daysSinceMonday * DAY_MS);
  return {
    todayStart,
    tomorrowStart: new Date(todayStart.getTime() + DAY_MS),
    weekStart,
    weekEnd: new Date(weekStart.getTime() + 7 * DAY_MS),
  };
}
