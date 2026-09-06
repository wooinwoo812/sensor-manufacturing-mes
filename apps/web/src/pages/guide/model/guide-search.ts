import {
  DOCUMENT_CATALOG,
  findGuideDocument,
  type GuideDocument,
} from "./guide-catalog";

export const GUIDE_TABS = [
  { value: "overview", label: "시작하기" },
  { value: "rules", label: "화면 규칙" },
  { value: "system", label: "디자인 시스템" },
  { value: "engineering", label: "전체 문서" },
] as const;
export type GuideTab = (typeof GUIDE_TABS)[number]["value"];
export interface GuideSearch {
  tab?: Exclude<GuideTab, "overview">;
  doc?: string;
}
const DOCUMENT_ALIASES: Record<string, string> = {
  architecture: "frontend-architecture",
  requests: "api-requests",
};

export function readGuideSearch(search: Record<string, unknown>): GuideSearch {
  const tab = GUIDE_TABS.find((item) => item.value === search.tab)?.value;
  if (tab === "rules" || tab === "system") return { tab };
  const rawDoc = typeof search.doc === "string" ? search.doc : "";
  const doc = findGuideDocument(DOCUMENT_ALIASES[rawDoc] ?? rawDoc);
  if (doc)
    return doc.id === "operations" && tab !== "engineering"
      ? { doc: doc.id }
      : { tab: "engineering", doc: doc.id };
  return tab === "engineering" ? { tab } : {};
}

export function guideDocument(search: GuideSearch): GuideDocument | undefined {
  const id =
    search.tab === "rules"
      ? "table-rules"
      : search.tab === "system"
        ? "design-system"
        : search.doc;
  return findGuideDocument(id);
}

export function documentSearch(id: string): GuideSearch {
  if (id === "table-rules") return { tab: "rules" };
  if (id === "design-system") return { tab: "system" };
  if (id === "operations") return { doc: "operations" };
  return readGuideSearch({ tab: "engineering", doc: id });
}

export function resolveGuideDocumentLink(
  href: string,
  fromPath: string,
): GuideSearch | undefined {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(href)) return undefined;
  const relative = href.split("#")[0]?.split("?")[0];
  if (!relative) return undefined;
  const parts = relative.startsWith("/")
    ? []
    : fromPath.split("/").slice(0, -1);
  for (const part of relative.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  const doc = DOCUMENT_CATALOG.find((item) => item.path === parts.join("/"));
  return doc ? documentSearch(doc.id) : undefined;
}
