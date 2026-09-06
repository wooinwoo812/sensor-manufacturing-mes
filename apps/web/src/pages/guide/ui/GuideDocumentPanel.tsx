import type { GuideDocument } from "../model/guide-catalog";
import type { GuideSearch } from "../model/guide-search";
import { GuideDocumentHeader } from "./GuideDocumentHeader";
import { DocumentReader } from "./DocumentReader";

interface GuideDocumentPanelProps {
  document: GuideDocument;
  onSearchChange: (next: GuideSearch) => void;
}

export function GuideDocumentPanel({
  document,
  onSearchChange,
}: GuideDocumentPanelProps) {
  return (
    <>
      <GuideDocumentHeader
        document={document}
        onSearchChange={onSearchChange}
      />
      <DocumentReader
        key={document.id}
        document={document}
        onSearchChange={onSearchChange}
      />
      <p className="break-all border-t border-border pt-4 text-sm leading-6 text-text-muted">
        원문: {document.path}
      </p>
    </>
  );
}
