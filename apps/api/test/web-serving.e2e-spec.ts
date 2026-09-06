import { Controller, Get } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { serveWeb } from "../src/web-serving.js";

@Controller("health")
class HealthController {
  @Get()
  health() { return { status: "ok" }; }
}

let app: NestExpressApplication;
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "mes-web-serving-"));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<!doctype html><div id=\"root\">MES</div>");
  await writeFile(join(directory, "assets", "app.js"), "console.log('MES');");
  const module = await Test.createTestingModule({ controllers: [HealthController] }).compile();
  app = module.createNestApplication<NestExpressApplication>();
  app.setGlobalPrefix("api");
  await serveWeb(app, directory);
  await app.init();
});

afterAll(async () => {
  await app?.close();
  if (directory?.startsWith(join(tmpdir(), "mes-web-serving-"))) {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each(["/", "/index.html", "/login", "/work-orders/order-123", "/quality/inspections/check-123"])("serves the web app for direct navigation to %s", async path => {
  const result = await request(app.getHttpServer()).get(path).expect(200).expect("Content-Type", /text\/html/);
  expect(result.text).toContain('id="root"');
  expect(result.headers["cache-control"]).toBe("no-cache");
});

it("serves assets while retaining API responses", async () => {
  await request(app.getHttpServer()).get("/assets/app.js").expect(200).expect("Content-Type", /javascript/);
  await request(app.getHttpServer()).get("/api/health").expect(200, { status: "ok" });
});

it.each(["/api/unknown", "/API/unknown", "/assets/missing.js", "/missing.png"])("does not disguise a missing API or asset as HTML: %s", async path => {
  const result = await request(app.getHttpServer()).get(path).expect(404);
  expect(result.text).not.toContain('id="root"');
});

it("does not answer an unknown mutation with the SPA", async () => {
  await request(app.getHttpServer()).post("/unknown").expect(404);
});
