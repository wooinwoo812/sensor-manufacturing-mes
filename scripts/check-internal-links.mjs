import path from "node:path";
import { findBrokenInternalLinks } from "./internal-links.mjs";

const rootDirectory = path.resolve(process.cwd());
const brokenLinks = await findBrokenInternalLinks(rootDirectory);

if (brokenLinks.length > 0) {
  console.error("깨진 저장소 내부 링크를 발견했습니다:");
  for (const link of brokenLinks) {
    console.error(`- ${link.file}: ${link.destination}`);
  }
  process.exitCode = 1;
} else {
  console.log("저장소 내부 Markdown 링크가 모두 유효합니다.");
}
