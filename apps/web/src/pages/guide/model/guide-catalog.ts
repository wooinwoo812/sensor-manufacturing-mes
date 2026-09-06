import catalog from "../../../../../../docs/catalog.json";

export type GuideDocument = (typeof catalog)[number];
export const DOCUMENT_CATALOG: readonly GuideDocument[] = catalog;
export const DOCUMENT_GROUPS = [
  "전체",
  ...new Set(catalog.map((doc) => doc.group)),
];

export const DOCUMENT_STATE_OPTIONS = [
  { value: "전체", label: "전체 상태" },
  { value: "현재", label: "현재 기준" },
  { value: "설계", label: "설계·목표" },
  { value: "결정", label: "기술 결정" },
  { value: "기록", label: "변경·검증 기록" },
  { value: "과거", label: "과거 기준·인수인계" },
  { value: "참고", label: "참고 자료" },
  { value: "양식", label: "작성 양식" },
];

export function groupGuideDocuments(documents: readonly GuideDocument[]) {
  return DOCUMENT_GROUPS.filter((group) => group !== "전체")
    .map((group) => ({
      group,
      documents: documents.filter((doc) => doc.group === group),
    }))
    .filter((section) => section.documents.length > 0);
}

export function findGuideDocument(
  id: string | undefined,
): GuideDocument | undefined {
  return DOCUMENT_CATALOG.find((doc) => doc.id === id);
}

export function filterGuideDocuments(
  query: string,
  group: string,
  state = "전체",
): GuideDocument[] {
  const needle = query.trim().toLocaleLowerCase();
  return DOCUMENT_CATALOG.filter(
    (doc) =>
      (group === "전체" || doc.group === group) &&
      (state === "전체" || doc.state === state) &&
      [doc.title, doc.summary, doc.path, doc.state]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
  );
}
