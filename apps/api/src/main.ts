import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";
import { PrismaService } from "./database/prisma.service.js";
import { runtimeConfig } from "./runtime-config.js";
import { serveWeb } from "./web-serving.js";

async function bootstrap() {
  const configuration = runtimeConfig();
  process.env.WEB_ORIGIN = configuration.webOrigin;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  if (configuration.production || configuration.webDirectory) {
    await serveWeb(
      app,
      configuration.webDirectory ?? fileURLToPath(new URL("../../web/dist/", import.meta.url)),
    );
  }
  if (configuration.production) {
    await app.get(PrismaService).$connect();
  }
  await app.listen(configuration.port, "0.0.0.0");
}

await bootstrap();
