import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../src/database/database-url.js";

describe("resolveDatabaseUrl", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("환경변수 값을 그대로 반환한다", () => {
    process.env.DATABASE_URL =
      "postgresql://user:secret@db.example.test:5433/sensor_mes?schema=public";

    expect(resolveDatabaseUrl()).toBe(
      "postgresql://user:secret@db.example.test:5433/sensor_mes?schema=public",
    );
  });

  it("환경변수가 없으면 localhost로 대체하지 않고 실패한다", () => {
    expect(() => resolveDatabaseUrl()).toThrowError(/DATABASE_URL/);
  });

  it("공백만 있는 값도 미설정으로 본다", () => {
    process.env.DATABASE_URL = "   ";

    expect(() => resolveDatabaseUrl()).toThrowError(/DATABASE_URL/);
  });
});
