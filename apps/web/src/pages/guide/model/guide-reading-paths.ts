import { findGuideDocument } from "./guide-catalog";

const readingPaths = [
  {
    title: "업무를 확인하는 담당자",
    description: "화면의 번호·수량·상태를 어떤 순서로 대조할지 읽습니다.",
    ids: ["operations", "table-rules", "routes"],
  },
  {
    title: "구현을 검토하는 개발자",
    description: "시연에서 본 동작을 화면·API·DB·테스트의 근거와 연결합니다.",
    ids: [
      "demo",
      "frontend-architecture",
      "backend",
      "api-reference",
      "database",
      "local-operations",
    ],
  },
];

// Resolve static reading paths once. A missing catalog entry is a configuration error,
// not a reason to render an incomplete reading path or fetch an arbitrary file.
export const GUIDE_READING_PATHS = readingPaths.map(({ ids, ...path }) => ({
  ...path,
  documents: ids.map((id) => {
    const document = findGuideDocument(id);
    if (!document)
      throw new Error(
        "가이드 읽기 순서에 등록되지 않은 문서가 있습니다: " + id,
      );
    return document;
  }),
}));
