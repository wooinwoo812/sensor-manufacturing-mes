import { Button, EmptyState, Input, Select } from "@/shared/ui";
import {
  DOCUMENT_CATALOG,
  DOCUMENT_GROUPS,
  DOCUMENT_STATE_OPTIONS,
  filterGuideDocuments,
  groupGuideDocuments,
} from "../model/guide-catalog";
import { documentSearch, type GuideSearch } from "../model/guide-search";

interface GuideCatalogProps {
  query: string;
  group: string;
  state: string;
  onQueryChange: (query: string) => void;
  onGroupChange: (group: string) => void;
  onStateChange: (state: string) => void;
  onSearchChange: (next: GuideSearch) => void;
}

export function GuideCatalog({
  query,
  group,
  state,
  onQueryChange,
  onGroupChange,
  onStateChange,
  onSearchChange,
}: GuideCatalogProps) {
  const results = filterGuideDocuments(query, group, state);
  const sections = groupGuideDocuments(results);
  function resetFilters() {
    onQueryChange("");
    onGroupChange("전체");
    onStateChange("전체");
  }
  return (
    <section
      aria-label="전체 문서 탐색"
      className="grid min-w-0 gap-5 rounded-panel border border-border bg-surface p-4 sm:p-5 xl:grid-cols-[160px_minmax(0,1fr)] xl:gap-6"
    >
      <nav
        aria-label="문서 분류"
        className="flex flex-wrap content-start gap-1 self-start border-b border-border pb-4 xl:sticky xl:top-24 xl:grid xl:border-b-0 xl:pb-0"
      >
        {DOCUMENT_GROUPS.map((value) => (
          <button
            type="button"
            aria-pressed={group === value}
            key={value}
            onClick={() => onGroupChange(value)}
            className={`flex min-h-11 items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-focus ${group === value ? "bg-accent-soft font-medium text-accent-strong" : "text-text-muted hover:bg-surface-subtle"}`}
          >
            <span>{value}</span>
            <span aria-hidden="true" className="tabular-nums">
              {value === "전체"
                ? DOCUMENT_CATALOG.length
                : DOCUMENT_CATALOG.filter((doc) => doc.group === value).length}
            </span>
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-6">
        <div>
          <h2 className="sr-only">어떤 문서를 찾으시나요?</h2>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <Input
              label="문서 제목·설명·경로 검색"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="API, 데이터베이스, 검사…"
            />
            <Select
              label="문서 상태"
              options={DOCUMENT_STATE_OPTIONS}
              value={state}
              onValueChange={onStateChange}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm leading-6 text-text-muted">
              {results.length}개 표시 / 전체 {DOCUMENT_CATALOG.length}개
            </p>
            {query || group !== "전체" || state !== "전체" ? (
              <Button variant="ghost" onClick={resetFilters}>
                검색·분류 초기화
              </Button>
            ) : null}
          </div>
        </div>
        {results.length ? (
          sections.map((section) => (
            <section
              key={section.group}
              aria-label={section.group + " 문서"}
              className="min-w-0"
            >
              <div className="mb-1 flex items-center gap-3 border-b border-border pb-3">
                <h2 className="text-lg font-semibold">{section.group}</h2>
                <span className="text-sm tabular-nums text-text-muted">
                  {section.documents.length}개
                </span>
              </div>
              <ul className="divide-y divide-border">
                {section.documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      title={doc.path}
                      className="group block w-full rounded-control px-2 py-3 text-left hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                      onClick={() => onSearchChange(documentSearch(doc.id))}
                    >
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1 text-base font-semibold leading-6 group-hover:text-accent-strong">
                          {doc.title}
                        </span>
                        <span className="shrink-0 text-sm text-text-muted">
                          {doc.state}
                        </span>
                      </span>
                      <span className="mt-1 block max-w-[72ch] text-sm leading-6 text-text-muted">
                        {doc.summary}
                      </span>
                      <span className="sr-only">{doc.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="py-8">
            <EmptyState
              title="조건에 맞는 문서가 없습니다"
              description="검색어·분류·문서 상태를 바꾸거나 위에서 초기화해 주세요."
            />
          </div>
        )}
      </div>
    </section>
  );
}
