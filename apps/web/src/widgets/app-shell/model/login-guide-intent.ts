import type { RoleCode } from "@/entities/session";

const KEY = "mes:login-guide:v1";
const TTL = 2 * 60 * 1000;

/** A one-use presentation preference, never an authentication or permission cache. */
export function prepareLoginGuide(role: RoleCode, requested: boolean): void {
  clearLoginGuide();
  if (!requested) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, role, expiresAt: Date.now() + TTL }),
    );
  } catch {
    // Storage may be blocked. Normal login and the existing invitation remain available.
  }
}

/** Reading is non-consuming so React's repeated initializers see the same preference. */
export function hasLoginGuide(role: RoleCode): boolean {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (
      candidate.version === 1 &&
      candidate.role === role &&
      typeof candidate.expiresAt === "number" &&
      Number.isFinite(candidate.expiresAt) &&
      candidate.expiresAt > Date.now() &&
      candidate.expiresAt <= Date.now() + TTL
    );
  } catch {
    return false;
  }
}

export function clearLoginGuide(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Presentation-only storage is optional. */
  }
}
