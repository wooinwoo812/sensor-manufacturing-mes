import type { ReactNode } from "react";
import { Main } from "@/widgets/app-shell";
import {
  Button,
  FormActions,
  PageHeading,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import {
  GUIDE_TABS,
  guideDocument,
  readGuideSearch,
  type GuideSearch,
} from "../model/guide-search";
export function GuideFrame({
  search,
  onSearchChange,
  children,
}: {
  search: GuideSearch;
  onSearchChange: (next: GuideSearch) => void;
  children: ReactNode;
}) {
  const active = search.tab ?? "overview";
  const selected = guideDocument(search);
  return (
    <Main id="main-content" className="py-4 sm:py-6">
      <PageHeading
        title="업무 가이드"
        description="업무 안내, 화면 규칙과 개발 문서를 한곳에서 확인합니다."
      />
      <Tabs
        value={active}
        activationMode="manual"
        onValueChange={(tab) => onSearchChange(readGuideSearch({ tab }))}
        className="min-w-0 gap-4 sm:gap-6"
      >
        <TabsList
          aria-label="가이드 분류"
          className="grid h-auto w-full grid-cols-[1fr_1fr_1.3fr_1fr] gap-0 rounded-none border-b border-border bg-transparent p-0 sm:flex sm:justify-start sm:gap-1"
        >
          {GUIDE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-11 min-w-0 flex-none rounded-none sm:min-w-32 sm:px-5 sm:text-base border-0 border-b-2 border-transparent px-0 text-sm text-text-muted data-[state=active]:border-accent-strong data-[state=active]:bg-transparent data-[state=active]:text-accent-strong data-[state=active]:shadow-none dark:data-[state=active]:border-accent-strong dark:data-[state=active]:bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {GUIDE_TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={
              selected
                ? "min-w-0 space-y-4 rounded-panel border border-border bg-surface p-3 sm:space-y-6 sm:p-6"
                : "min-w-0 space-y-5"
            }
          >
            {active === tab.value ? children : null}
          </TabsContent>
        ))}
      </Tabs>
      {selected ? (
        <FormActions>
          <Button
            variant="secondary"
            onClick={() => onSearchChange({ tab: "engineering" })}
          >
            목록으로
          </Button>
        </FormActions>
      ) : null}
    </Main>
  );
}
