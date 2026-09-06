import { Test } from "@nestjs/testing";
import { expect, it, vi } from "vitest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/database/prisma.service.js";

it("shares one database client across the complete application", async () => {
  const createClient = vi.fn(() => ({ $disconnect: vi.fn() }));
  const app = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useFactory({ factory: createClient })
    .compile();
  try {
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(app.get(PrismaService)).toBe(createClient.mock.results[0]?.value);
  } finally {
    await app.close();
  }
});
