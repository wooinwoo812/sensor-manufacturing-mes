import { resolveShellContext } from "./shell-config";
import type { Session } from "@/entities/session";
const routes = [
  ["dashboard:read", "/dashboard"],
  ["work-order:read", "/work-orders"],
  ["process-execution:read", "/execution/queue"],
  ["master-data:read", "/materials/boms"],
  ["material-lot:read", "/materials/lots"],
  ["inspection:read", "/quality/inspections"],
  ["quality-incident:read", "/quality/incidents"],
  ["trace:read", "/traceability"],
  ["audit-event:read", "/audit-events"],
  ["user:manage", "/admin/users"],
];
const session: Session = {
  user: { id: "sidebar", email: "sidebar@example.com", displayName: "test" },
  activeRole: { code: "SYSTEM_ADMIN", label: "최고관리자" },
  permissions: routes.map(([permission]) => permission!),
  landingRoute: "/dashboard",
  expiresAt: "2099-01-01T00:00:00Z",
  csrfToken: "test",
};
it("groups the existing menu order into three categories without adding destinations", () => {
  const shell = resolveShellContext("/guide", session);
  expect(shell.navigation.map((group) => group.label)).toEqual([
    "생산 운영",
    "자재·품질",
    "추적·관리",
  ]);
  expect(
    shell.navigation.flatMap((group) => group.items.map((item) => item.to)),
  ).toEqual(routes.map(([, route]) => route));
});
it.each(routes)(
  "%s only grants the original route %s and removes empty groups",
  (permission, route) => {
    const shell = resolveShellContext(route!, {
      ...session,
      permissions: [permission!],
    });
    expect(shell.navigation).toHaveLength(1);
    expect(
      shell.navigation.flatMap((group) => group.items.map((item) => item.to)),
    ).toEqual([route]);
  },
);
it("keeps no business groups when no business permissions are present", () => {
  expect(
    resolveShellContext("/guide", { ...session, permissions: [] }).navigation,
  ).toEqual([]);
});
