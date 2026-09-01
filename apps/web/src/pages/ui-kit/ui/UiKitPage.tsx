import { Button } from "@/shared/ui";

export function UiKitPage() {
  return (
    <section className="rounded-panel border border-border bg-surface p-6 shadow-panel" aria-labelledby="button-showcase-heading">
      <div className="border-b border-border pb-4">
        <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-accent">
          SHARED / UI
        </span>
        <h2 className="mt-1 text-lg font-bold text-text-strong" id="button-showcase-heading">
          버튼 상태
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          제품 화면과 같은 토큰·컴포넌트를 사용하는 개발 전용 점검 화면입니다.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button>대표 행동</Button>
        <Button variant="secondary">보조 행동</Button>
        <Button variant="ghost">텍스트 행동</Button>
        <Button variant="danger">위험 행동</Button>
        <Button loading>저장</Button>
        <Button disabled>사용 불가</Button>
      </div>
    </section>
  );
}
