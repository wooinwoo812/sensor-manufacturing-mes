import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Code2 } from "lucide-react";
import { Button } from "@/shared/ui";
import { DOCUMENT_CATALOG } from "../model/guide-catalog";
import { GUIDE_READING_PATHS } from "../model/guide-reading-paths";
import { documentSearch, type GuideSearch } from "../model/guide-search";

interface GuideStartProps {
  currentRole: string;
  availableScreens: ReactNode;
  startingScreen: ReactNode;
  onStartTour: () => void;
  onSearchChange: (next: GuideSearch) => void;
}

export function GuideStart({
  currentRole,
  availableScreens,
  startingScreen,
  onStartTour,
  onSearchChange,
}: GuideStartProps) {
  return (
    <>
      <section aria-labelledby="guide-reading-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="guide-reading-title" className="text-lg font-semibold">
            문서 바로가기
          </h2>
          <Button
            variant="ghost"
            onClick={() => onSearchChange({ tab: "engineering" })}
          >
            전체 문서 찾기 · {DOCUMENT_CATALOG.length}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {GUIDE_READING_PATHS.map((path, pathIndex) => {
            const Icon = pathIndex === 0 ? BookOpen : Code2;
            const renderDocument = (
              doc: (typeof path.documents)[number],
              index: number,
            ) => (
              <li key={doc.id}>
                <button
                  type="button"
                  className="group flex min-h-12 w-full items-center gap-3 rounded-control px-3 py-3 text-left text-base text-text-strong hover:bg-surface-subtle hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-focus"
                  onClick={() => onSearchChange(documentSearch(doc.id))}
                >
                  <span className="w-5 shrink-0 text-center text-sm tabular-nums text-text-muted">
                    {index + 1}
                  </span>
                  <span className="flex-1">{doc.title}</span>
                  <ArrowRight
                    className="size-4 shrink-0 text-text-muted group-hover:text-accent-strong"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
            return (
              <section
                key={path.title}
                className="flex min-w-0 flex-col rounded-panel border border-border bg-surface p-4 sm:p-5"
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-strong">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">
                      {pathIndex === 0 ? "업무 안내" : "개발 문서"}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      {pathIndex === 0
                        ? "업무 담당자를 위한 화면·기록 확인 기준"
                        : "개발 검토자를 위한 구조·API·검증 기준"}
                    </p>
                  </div>
                </div>
                <ol className="divide-y divide-border border-y border-border">
                  {path.documents.slice(0, 3).map(renderDocument)}
                </ol>
                {path.documents.length > 3 ? (
                  <details className="px-3 text-sm">
                    <summary className="min-h-11 cursor-pointer py-3 text-text-muted">
                      이어서 읽을 문서 {path.documents.length - 3}개
                    </summary>
                    <ol start={4} className="divide-y divide-border">
                      {path.documents
                        .slice(3)
                        .map((doc, i) => renderDocument(doc, i + 3))}
                    </ol>
                  </details>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      onSearchChange(
                        documentSearch(
                          pathIndex === 0 ? "index" : "engineering-index",
                        ),
                      )
                    }
                  >
                    {pathIndex === 0 ? "문서 길잡이" : "개발 문서 지도"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                  {pathIndex === 1 && import.meta.env.DEV ? (
                    <Button variant="ghost" asChild>
                      <Link to="/dev/ui-kit">
                        UI 시스템 점검
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>
      <section
        aria-labelledby="guide-start-title"
        className="rounded-panel border border-border bg-surface p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="guide-start-title" className="text-lg font-semibold">
              화면을 보며 시작하기
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              {currentRole}의 실제 업무 화면을 따라가며 읽을 곳을 안내합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {startingScreen}
            <Button onClick={onStartTour}>
              화면 안내 시작
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          시작 전 동의를 묻습니다. 안내 중 저장·판정은 실행하지 않습니다.
        </p>
        <details className="mt-3 border-t border-border pt-1 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            {currentRole} · 열 수 있는 업무 화면
          </summary>
          <nav
            aria-label="현재 역할 업무 바로가기"
            className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            {availableScreens}
          </nav>
          <ol
            aria-label="첫 확인 순서"
            className="mt-4 grid gap-2 text-sm leading-6 text-text-muted sm:grid-cols-3"
          >
            <li>1. 역할과 업무 선택</li>
            <li>2. 번호·제품·수량·상태 확인</li>
            <li>3. 관련 이력과 문서 대조</li>
          </ol>
          <p className="mt-3 leading-6 text-text-muted">
            문서 열람과 실제 업무 데이터의 조회·수정 권한은 별개입니다.
          </p>
        </details>
      </section>
      <p className="text-sm leading-6 text-text-muted">
        가상 제조 데이터를 사용하는 MES 포트폴리오입니다. 실제 운영·고객 성과를
        나타내지 않습니다.
      </p>
    </>
  );
}
