import { describe, expect, it } from "vitest";
import { ROLE_CODES, type Session } from "@/entities/session";
import { resolvePostLoginPath } from "./session-policy";
import { resolveShellContext } from "./shell-config";

const session: Session = {
  user: { id: "test", email: "test@example.com", displayName: "test" },
  activeRole: { code: "SHOP_FLOOR_OPERATOR", label: "현장 작업자" },
  permissions: ["process-execution:read"],
  landingRoute: "/execution/queue",
  expiresAt: "2099-01-01T00:00:00Z",
  csrfToken: "test",
};
describe("guide role boundary", () => {
  it.each(ROLE_CODES)("allows a guide deep link after login for %s", (code) => {
    expect(
      resolvePostLoginPath(
        { ...session, activeRole: { code, label: code } },
        "/guide?tab=system",
      ),
    ).toBe("/guide?tab=system");
  });
  it("does not widen business permissions or allow external redirects", () => {
    for (const path of [
      "/admin/users",
      "//external.test/guide",
      "https://external.test/guide",
      "/guide/unknown",
    ])
      expect(resolvePostLoginPath(session, path)).toBe("/execution/queue");
    const shell = resolveShellContext("/guide", session);
    expect(shell.pageTitle).toBe("업무 가이드");
    expect(
      shell.navigation.flatMap((group) => group.items.map((item) => item.to)),
    ).toEqual(["/execution/queue"]);
  });
});

it("opens work-order creation after login only when the server grants it", () => {
  const admin: Session = {
    ...session,
    activeRole: { code: "SYSTEM_ADMIN", label: "최고관리자" },
    landingRoute: "/dashboard",
    permissions: ["dashboard:read", "work-order:create"],
  };
  expect(resolvePostLoginPath(admin)).toBe("/dashboard");
  expect(resolvePostLoginPath(admin, "/work-orders/new")).toBe(
    "/work-orders/new",
  );
  expect(
    resolvePostLoginPath({ ...admin, permissions: [] }, "/work-orders/new"),
  ).toBe("/dashboard");
  expect(resolvePostLoginPath(session, "/work-orders/new")).toBe(
    "/execution/queue",
  );
});
