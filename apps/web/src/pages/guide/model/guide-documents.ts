import { findGuideDocument } from "./guide-catalog";

const sources = import.meta.glob<string>("../../../../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
});
const rootSources: Record<string, () => Promise<string>> = {
  "README.md": () =>
    import("../../../../../../README.md?raw").then((m) => m.default),
  "PRODUCT.md": () =>
    import("../../../../../../PRODUCT.md?raw").then((m) => m.default),
  "CONTRIBUTING.md": () =>
    import("../../../../../../CONTRIBUTING.md?raw").then((m) => m.default),
  "THIRD_PARTY_NOTICES.md": () =>
    import("../../../../../../THIRD_PARTY_NOTICES.md?raw").then(
      (m) => m.default,
    ),
};

const completed = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
/** Public, build-owned Markdown only; unrelated to authenticated API response caching. */
export function readGuideDocument(id: string) {
  return completed.get(id);
}

export function loadGuideDocument(id: string): Promise<string> {
  const cached = completed.get(id);
  if (cached !== undefined) return Promise.resolve(cached);
  const existing = pending.get(id);
  if (existing) return existing;
  const doc = findGuideDocument(id);
  const loader =
    doc && (rootSources[doc.path] ?? sources["../../../../../../" + doc.path]);
  if (!loader) return Promise.reject(new Error("등록되지 않은 문서입니다."));
  const request = loader()
    .then((source) => {
      completed.set(id, source);
      return source;
    })
    .finally(() => pending.delete(id));
  pending.set(id, request);
  return request;
}
