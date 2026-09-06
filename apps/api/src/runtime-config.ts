const localDatabaseUrl =
  "postgresql://sensor_mes:sensor_mes_local@localhost:5432/sensor_mes?schema=public";

export function databaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const value = environment.DATABASE_URL?.trim();
  if (value) return value;
  if (environment.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be configured in production.");
  }
  return localDatabaseUrl;
}

export function databasePoolMax(environment: NodeJS.ProcessEnv = process.env) {
  const max = Number(environment.DB_POOL_MAX ?? 5);
  if (!Number.isInteger(max) || max < 1 || max > 20) {
    throw new Error("DB_POOL_MAX must be an integer from 1 to 20.");
  }
  return max;
}

export function runtimeConfig(environment: NodeJS.ProcessEnv = process.env) {
  const production = environment.NODE_ENV === "production";
  const port = Number(environment.PORT ?? environment.API_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT or API_PORT must be an integer from 1 to 65535.");
  }

  const origin = environment.WEB_ORIGIN ?? environment.RENDER_EXTERNAL_URL;
  if (production) {
    databaseUrl(environment);
    let parsed: URL;
    try {
      parsed = new URL(origin ?? "");
    } catch {
      throw new Error("WEB_ORIGIN must be the public HTTPS origin in production.");
    }
    if (parsed.protocol !== "https:" || parsed.origin !== origin) {
      throw new Error("WEB_ORIGIN must be an HTTPS origin without a path or credentials.");
    }
  }

  return {
    port,
    production,
    webOrigin: origin ?? "http://localhost:5173",
    webDirectory: environment.WEB_DIST_DIR,
  };
}
