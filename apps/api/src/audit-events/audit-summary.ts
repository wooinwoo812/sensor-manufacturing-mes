/** PostgreSQL varchar counts characters; keep the full reason in details/domain data. */
export function auditSummary(text: string): string {
  const characters = Array.from(text);
  return characters.length <= 200 ? text : `${characters.slice(0, 199).join("")}…`;
}
