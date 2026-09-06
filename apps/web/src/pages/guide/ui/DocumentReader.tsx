import { useEffect, useState } from "react";
import { Button, ErrorState } from "@/shared/ui";
import { loadGuideDocument, readGuideDocument } from "../model/guide-documents";
import type { GuideDocument } from "../model/guide-catalog";
import {
  resolveGuideDocumentLink,
  type GuideSearch,
} from "../model/guide-search";
import { DocumentView } from "./DocumentView";
import { GuideLoading } from "./GuideLoading";
import { resolveGuideAsset } from "../model/guide-assets";

export function DocumentReader({
  document,
  onSearchChange,
}: {
  document: GuideDocument;
  onSearchChange: (search: GuideSearch) => void;
}) {
  type Loaded =
    | { id: string; phase: "success"; source: string }
    | { id: string; phase: "error"; message: string };
  const [loaded, setLoaded] = useState<Loaded>();
  const cached = readGuideDocument(document.id);
  const state =
    loaded?.id === document.id
      ? loaded
      : cached !== undefined
        ? { phase: "success" as const, source: cached }
        : { phase: "loading" as const };
  useEffect(() => {
    if (readGuideDocument(document.id) !== undefined) return;
    let active = true;
    void loadGuideDocument(document.id).then(
      (source) => {
        if (active) setLoaded({ id: document.id, phase: "success", source });
      },
      () => {
        if (active)
          setLoaded({
            id: document.id,
            phase: "error",
            message:
              "문서를 불러오지 못했습니다. 연결을 확인한 뒤 화면을 새로고침해 주세요. 선택한 문서 주소는 유지됩니다.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [document.id]);
  if (state.phase === "loading")
    return (
      <GuideLoading label={`${document.title} 문서를 불러오고 있습니다.`} />
    );
  if (state.phase === "error")
    return (
      <ErrorState
        description={state.message}
        action={
          <Button onClick={() => window.location.reload()}>
            화면 새로고침
          </Button>
        }
      />
    );
  return (
    <DocumentView
      source={state.source}
      documentId={document.id}
      hideTitle
      onDocumentLink={onSearchChange}
      resolveDocumentLink={(href) =>
        resolveGuideDocumentLink(href, document.path)
      }
      resolveAssetLink={(href) => resolveGuideAsset(href, document.path)}
    />
  );
}
