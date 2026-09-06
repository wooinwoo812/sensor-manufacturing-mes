import { describe, expect, it } from "vitest";
import { databasePoolMax, databaseUrl, runtimeConfig } from "../src/runtime-config.js";

const production = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:secret@database:5432/mes",
  WEB_ORIGIN: "https://mes.example.com",
};

describe("deployment environment", () => {
  it("bounds the shared database pool for a small server", () => {
    expect(databasePoolMax({})).toBe(5);
    expect(databasePoolMax({ DB_POOL_MAX: "10" })).toBe(10);
    for (const value of ["", "0", "-1", "1.5", "21", "invalid"]) {
      expect(() => databasePoolMax({ DB_POOL_MAX: value })).toThrow(/DB_POOL_MAX/);
    }
  });

  it("uses the hosting port before the development port", () => {
    expect(runtimeConfig({ ...production, PORT: "10000", API_PORT: "3000" }).port).toBe(10000);
    expect(runtimeConfig({ API_PORT: "3100" }).port).toBe(3100);
  });

  it.each(["", "0", "-1", "3000.5", "65536", "invalid"])("rejects invalid port %s", PORT => {
    expect(() => runtimeConfig({ ...production, PORT })).toThrow(/PORT/);
  });

  it("requires a production database instead of using the local fallback", () => {
    expect(() => databaseUrl({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(databaseUrl(production)).toBe(production.DATABASE_URL);
  });

  it.each([undefined, "http://mes.example.com", "https://mes.example.com/path", "https://user:secret@mes.example.com"])("rejects unsafe or ambiguous production origin %s", WEB_ORIGIN => {
    expect(() => runtimeConfig({ ...production, WEB_ORIGIN })).toThrow(/WEB_ORIGIN/);
  });

  it("accepts Render's assigned origin without trusting request headers", () => {
    expect(runtimeConfig({ NODE_ENV: "production", DATABASE_URL: production.DATABASE_URL, RENDER_EXTERNAL_URL: "https://mes.onrender.com" }).webOrigin).toBe("https://mes.onrender.com");
  });
});
