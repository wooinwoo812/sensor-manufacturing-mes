import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, join } from "node:path";
import type { NestExpressApplication } from "@nestjs/platform-express";

export async function serveWeb(app: NestExpressApplication, directory: string) {
  // Fail before listening if the deployed artifact is missing the web build.
  const index = await readFile(join(directory, "index.html"));
  app.useStaticAssets(directory, {
    index: false,
    redirect: false,
    dotfiles: "deny",
    maxAge: "1h",
    setHeaders(response, path) {
      if (basename(path) === "index.html") response.setHeader("Cache-Control", "no-cache");
    },
  });

  app.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const pathname = new URL(request.url ?? "/", "http://mes.local").pathname;
    if (
      (request.method !== "GET" && request.method !== "HEAD") ||
      /^\/api(?:\/|$)/i.test(pathname) ||
      /^\/assets(?:\/|$)/i.test(pathname) ||
      pathname.includes(".")
    ) {
      next();
      return;
    }

    // React Router handles deep links; API and missing assets keep their real 404.
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache");
    response.end(request.method === "HEAD" ? undefined : index);
  });
}
