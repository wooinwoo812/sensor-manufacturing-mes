import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const markdownLinkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
const ignoredSchemes = /^(?:https?:|mailto:|tel:|data:)/i;

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if ([".git", "coverage", "dist", "node_modules", "vendor"].includes(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

function extractPath(rawDestination) {
  const destination = rawDestination.trim();
  if (destination.startsWith("<")) {
    const closingBracket = destination.indexOf(">");
    return closingBracket === -1
      ? destination.slice(1)
      : destination.slice(1, closingBracket);
  }

  return destination.split(/\s+/u, 1)[0] ?? "";
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function findBrokenInternalLinks(rootDirectory) {
  const files = await collectMarkdownFiles(rootDirectory);
  const brokenLinks = [];

  for (const file of files) {
    const contents = await import("node:fs/promises").then(({ readFile }) =>
      readFile(file, "utf8"),
    );

    for (const match of contents.matchAll(markdownLinkPattern)) {
      const destination = extractPath(match[1] ?? "");
      if (!destination || destination.startsWith("#") || ignoredSchemes.test(destination)) {
        continue;
      }

      const pathWithoutFragment = destination.split(/[?#]/u, 1)[0] ?? "";
      if (!pathWithoutFragment) {
        continue;
      }

      const decodedPath = decodeURIComponent(pathWithoutFragment);
      const targetPath = path.resolve(path.dirname(file), decodedPath);
      if (!(await exists(targetPath))) {
        brokenLinks.push({
          file: path.relative(rootDirectory, file),
          destination,
        });
      }
    }
  }

  return brokenLinks;
}
