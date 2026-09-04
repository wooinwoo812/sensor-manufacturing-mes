import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const defaultPort = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const port = parsePort(process.env.API_PORT);
  await app.listen(port, "0.0.0.0");
}

function parsePort(rawPort: string | undefined) {
  if (rawPort === undefined) {
    return defaultPort;
  }

  const parsedPort = Number(rawPort);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error(`API_PORT가 유효하지 않습니다: ${rawPort}`);
  }

  return parsedPort;
}

await bootstrap();
