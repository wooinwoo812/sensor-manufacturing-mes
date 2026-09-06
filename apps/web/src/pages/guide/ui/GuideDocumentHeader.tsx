import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui";
import type { GuideDocument } from "../model/guide-catalog";
import type { GuideSearch } from "../model/guide-search";
export function GuideDocumentHeader({
  document,
  onSearchChange,
}: {
  document: GuideDocument;
  onSearchChange: (next: GuideSearch) => void;
}) {
  const note =
    document.state === "과거"
      ? "과거 시점의 기록입니다. 현재 구현과 구분해 읽어 주세요."
      : document.state === "기록"
        ? "작성 시점의 변경·검증 기록입니다. 현재 기준은 연결된 기준 문서를 확인하세요."
        : document.state === "설계"
          ? "목표·설계 내용이 포함된 문서입니다. 구현 완료를 뜻하지 않습니다."
          : undefined;
  return (
    <header className="space-y-3">
      <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <Button
          variant="ghost"
          className="-ml-3"
          onClick={() => onSearchChange({ tab: "engineering" })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          전체 문서
        </Button>
        <p className="text-text-muted">
          {document.group} · {document.state}
        </p>
      </div>
      <h1
        className="max-w-[32ch] text-2xl font-bold leading-tight tracking-tight text-text-strong"
        data-tour="page-title"
      >
        {document.title}
      </h1>
      {note ? (
        <p className="max-w-[78ch] border-l-2 border-border-strong pl-3 text-sm leading-6 text-text-muted">
          {note}
        </p>
      ) : null}
    </header>
  );
}
