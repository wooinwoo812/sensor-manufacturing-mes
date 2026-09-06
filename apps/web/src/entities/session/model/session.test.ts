import { describe, expect, it } from "vitest";
import { parseSessionResponse, sessionHasPermission } from "./session";
const response = {
  user: { id: "admin", email: "admin@example.com", displayName: "관리자" },
  activeRole: { code: "SYSTEM_ADMIN", label: "최고관리자" },
  permissions: ["dashboard:read", "work-order:create"],
  landingRoute: "/dashboard",
  expiresAt: "2099-01-01T00:00:00Z",
  csrfToken: "a".repeat(43),
};
describe("highest administrator session", () => {
  it("accepts the server-owned dashboard landing without changing the persisted role code", () => {
    expect(parseSessionResponse(response)).toMatchObject({
      activeRole: response.activeRole,
      landingRoute: "/dashboard",
    });
  });
  it("does not infer permissions merely from the role label or code", () => {
    const session = parseSessionResponse({ ...response, permissions: [] });
    expect(sessionHasPermission(session, "work-order:create")).toBe(false);
    expect(sessionHasPermission(session, "user:manage")).toBe(false);
  });
  it("continues rejecting unknown landing routes", () => {
    expect(() =>
      parseSessionResponse({ ...response, landingRoute: "/unknown" }),
    ).toThrow();
  });
});
