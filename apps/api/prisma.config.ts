import "dotenv/config";
import { defineConfig } from "prisma/config";

const localDatabaseUrl =
  "postgresql://sensor_mes:sensor_mes_local@localhost:5432/sensor_mes?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
});
