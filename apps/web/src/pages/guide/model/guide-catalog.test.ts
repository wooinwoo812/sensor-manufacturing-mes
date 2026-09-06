import { describe, expect, it } from "vitest";
import {
  DOCUMENT_CATALOG,
  DOCUMENT_GROUPS,
  DOCUMENT_STATE_OPTIONS,
  groupGuideDocuments,
  filterGuideDocuments,
  findGuideDocument,
} from "./guide-catalog";
import { GUIDE_READING_PATHS } from "./guide-reading-paths";

describe("guide catalog model", () => {
  it("keeps the catalog order and returns a separate result array", () => {
    const snapshot = JSON.stringify(DOCUMENT_CATALOG);
    const results = filterGuideDocuments("   ", "전체");
    expect(results).toEqual(DOCUMENT_CATALOG);
    expect(results).not.toBe(DOCUMENT_CATALOG);
    results.reverse();
    expect(JSON.stringify(DOCUMENT_CATALOG)).toBe(snapshot);
    expect(DOCUMENT_GROUPS).toEqual([
      "전체",
      ...new Set(DOCUMENT_CATALOG.map((doc) => doc.group)),
    ]);
  });

  it.each(["title", "summary", "path", "state"] as const)(
    "searches %s metadata without case or surrounding-space sensitivity",
    (field) => {
      const doc = findGuideDocument("api-reference")!;
      expect(
        filterGuideDocuments("  " + doc[field].toUpperCase() + "  ", "전체"),
      ).toContain(doc);
    },
  );

  it("combines the search term and group without falling back to all documents", () => {
    const doc = findGuideDocument("api-reference")!;
    expect(filterGuideDocuments("API-REFERENCE.MD", doc.group)).toEqual([doc]);
    expect(filterGuideDocuments("API-REFERENCE.MD", "기술 결정")).toEqual([]);
    expect(filterGuideDocuments("", "missing group")).toEqual([]);
    expect(filterGuideDocuments("missing document", "전체")).toEqual([]);
  });

  it.each(DOCUMENT_STATE_OPTIONS.filter((option) => option.value !== "전체"))(
    "filters $label separately from its topic",
    ({ value }) => {
      const results = filterGuideDocuments("", "전체", value);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((doc) => doc.state === value)).toBe(true);
      expect(results).toEqual(
        DOCUMENT_CATALOG.filter((doc) => doc.state === value),
      );
    },
  );

  it("combines state, topic and text without restoring excluded documents", () => {
    expect(
      filterGuideDocuments("api-reference.md", "개발", "현재").map(
        (doc) => doc.id,
      ),
    ).toEqual(["api-reference"]);
    expect(filterGuideDocuments("api-reference.md", "개발", "과거")).toEqual(
      [],
    );
    expect(filterGuideDocuments("", "개발", "missing")).toEqual([]);
  });

  it("groups visible documents once in topic order, without empty sections", () => {
    const documents = filterGuideDocuments("", "전체", "현재");
    const sections = groupGuideDocuments(documents);
    expect(sections.every((section) => section.documents.length > 0)).toBe(
      true,
    );
    expect(
      sections
        .flatMap((section) => section.documents)
        .map((doc) => doc.id)
        .sort(),
    ).toEqual(documents.map((doc) => doc.id).sort());
    for (const section of sections)
      expect(
        section.documents.every((doc) => doc.group === section.group),
      ).toBe(true);
    expect(groupGuideDocuments([])).toEqual([]);
  });

  it("only resolves registered document IDs", () => {
    expect(findGuideDocument("api-reference")?.path).toBe(
      "docs/engineering/api-reference.md",
    );
    expect(findGuideDocument(undefined)).toBeUndefined();
    expect(findGuideDocument("../../secret")).toBeUndefined();
    expect(findGuideDocument("architecture")).toBeUndefined();
  });

  it("resolves the complete staff and developer reading paths in order", () => {
    expect(
      GUIDE_READING_PATHS.map((path) => path.documents.map((doc) => doc.id)),
    ).toEqual([
      ["operations", "table-rules", "routes"],
      [
        "demo",
        "frontend-architecture",
        "backend",
        "api-reference",
        "database",
        "local-operations",
      ],
    ]);
    for (const path of GUIDE_READING_PATHS) {
      for (const doc of path.documents)
        expect(doc).toBe(findGuideDocument(doc.id));
    }
  });
});
