import {
  clearLoginGuide,
  hasLoginGuide,
  prepareLoginGuide,
} from "./login-guide-intent";

const KEY = "mes:login-guide:v1";
beforeEach(() => {
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("stores only an expiring role-scoped presentation choice, not session data", () => {
  prepareLoginGuide("SYSTEM_ADMIN", true);
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(true);
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(true);
  expect(hasLoginGuide("QUALITY_ENGINEER")).toBe(false);
  expect(Object.keys(JSON.parse(sessionStorage.getItem(KEY)!)).sort()).toEqual([
    "expiresAt",
    "role",
    "version",
  ]);
  clearLoginGuide();
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(false);
});

it("clears an older request when direct login is selected", () => {
  prepareLoginGuide("SYSTEM_ADMIN", true);
  prepareLoginGuide("SYSTEM_ADMIN", false);
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(false);
});

it("expires the choice rather than starting a tour on a later visit", () => {
  vi.useFakeTimers();
  prepareLoginGuide("SYSTEM_ADMIN", true);
  vi.advanceTimersByTime(120000);
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(false);
});

it.each([
  "invalid",
  "null",
  "[]",
  '{"version":2,"role":"SYSTEM_ADMIN"}',
  '{"version":1,"role":"SYSTEM_ADMIN","expiresAt":99999999999999}',
])("ignores malformed or unbounded preferences: %s", (raw) => {
  sessionStorage.setItem(KEY, raw);
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(false);
});

it("does not block login or normal invitations when storage is unavailable", () => {
  for (const method of ["getItem", "setItem", "removeItem"] as const)
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error("blocked");
    });
  expect(() => prepareLoginGuide("SYSTEM_ADMIN", true)).not.toThrow();
  expect(hasLoginGuide("SYSTEM_ADMIN")).toBe(false);
  expect(() => clearLoginGuide()).not.toThrow();
});
