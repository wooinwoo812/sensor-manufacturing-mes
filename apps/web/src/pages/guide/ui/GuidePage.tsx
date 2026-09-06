import { useState, type ReactNode } from "react";
import { guideDocument, type GuideSearch } from "../model/guide-search";
import { GuideFrame } from "./GuideFrame";
import { GuideCatalog } from "./GuideCatalog";
import { GuideDocumentPanel } from "./GuideDocumentPanel";
import { GuideStart } from "./GuideStart";

export interface GuidePageProps {
  search: GuideSearch;
  onSearchChange: (next: GuideSearch) => void;
  currentRole: string;
  availableScreens: ReactNode;
  startingScreen: ReactNode;
  onStartTour: () => void;
}

export function GuidePage({
  search,
  onSearchChange,
  currentRole,
  availableScreens,
  startingScreen,
  onStartTour,
}: GuidePageProps) {
  const active = search.tab ?? "overview";
  const selected = guideDocument(search);
  // Keep these at page level so reading a document or another tab preserves the catalog filters.
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("전체");
  const [state, setState] = useState("전체");

  let content: ReactNode;
  if (selected) {
    content = (
      <GuideDocumentPanel document={selected} onSearchChange={onSearchChange} />
    );
  } else if (active === "overview") {
    content = (
      <GuideStart
        currentRole={currentRole}
        availableScreens={availableScreens}
        startingScreen={startingScreen}
        onStartTour={onStartTour}
        onSearchChange={onSearchChange}
      />
    );
  } else {
    content = (
      <GuideCatalog
        query={query}
        group={group}
        state={state}
        onQueryChange={setQuery}
        onGroupChange={setGroup}
        onStateChange={setState}
        onSearchChange={onSearchChange}
      />
    );
  }

  return (
    <GuideFrame search={search} onSearchChange={onSearchChange}>
      {content}
    </GuideFrame>
  );
}
