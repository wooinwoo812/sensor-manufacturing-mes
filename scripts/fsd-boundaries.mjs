import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const layerRank = new Map([
  ["shared", 0],
  ["entities", 1],
  ["features", 2],
  ["widgets", 3],
  ["pages", 4],
  ["app", 5],
]);

const slicedLayers = new Set(["entities", "features", "widgets", "pages"]);
const importPattern = /(?:from\s+|import\s*)["']@\/(app|pages|widgets|features|entities|shared)(?:\/([^"']+))?["']/gu;

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (["coverage", "dist", "node_modules"].includes(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (
      entry.isFile() &&
      /\.(?:ts|tsx)$/u.test(entry.name) &&
      entry.name !== "routeTree.gen.ts"
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function sliceName(layer, segments) {
  if (layer === "features") {
    return segments.slice(0, 2).join("/");
  }

  return segments[0] ?? "";
}

function importsThroughPublicApi(layer, targetSegments) {
  if (layer === "app") {
    return true;
  }

  if (layer === "shared") {
    return targetSegments.length <= 1;
  }

  if (layer === "features") {
    return targetSegments.length <= 2;
  }

  return targetSegments.length <= 1;
}

export async function findFsdBoundaryViolations(sourceRoot) {
  const files = await collectSourceFiles(sourceRoot);
  const violations = [];

  for (const file of files) {
    const relativeFile = path.relative(sourceRoot, file).replaceAll("\\", "/");
    const [sourceLayer = "", ...sourceSegments] = relativeFile.split("/");
    const sourceRank = layerRank.get(sourceLayer);

    if (sourceRank === undefined) {
      continue;
    }

    const contents = await readFile(file, "utf8");
    for (const match of contents.matchAll(importPattern)) {
      const targetLayer = match[1] ?? "";
      const targetSegments = (match[2] ?? "").split("/").filter(Boolean);
      const targetRank = layerRank.get(targetLayer);

      if (targetRank === undefined) {
        continue;
      }

      if (targetRank > sourceRank) {
        violations.push({
          file: relativeFile,
          importPath: match[0],
          reason: `${sourceLayer} layer가 상위 ${targetLayer} layer를 import합니다.`,
        });
        continue;
      }

      if (
        sourceLayer === targetLayer &&
        slicedLayers.has(sourceLayer) &&
        sliceName(sourceLayer, sourceSegments) !==
          sliceName(targetLayer, targetSegments)
      ) {
        violations.push({
          file: relativeFile,
          importPath: match[0],
          reason: `${sourceLayer} layer의 다른 slice를 직접 import합니다.`,
        });
        continue;
      }

      if (
        sourceLayer !== targetLayer &&
        !importsThroughPublicApi(targetLayer, targetSegments)
      ) {
        violations.push({
          file: relativeFile,
          importPath: match[0],
          reason: `${targetLayer} layer의 public API를 우회한 deep import입니다.`,
        });
      }
    }
  }

  return violations;
}
